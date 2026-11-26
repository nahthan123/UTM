'use strict';

const $ = selector => document.querySelector(selector);
const state = {me: null, tab: 'drones', page: 0, rows: [], totalPages: 0, review: null, generation: 0, loadId: 0, myDroneSerials: new Set()};
let monitoringFeedTimer = null;
const staff = () => ['ADMIN', 'MANAGER'].includes(state.me?.role);
const admin = () => state.me?.role === 'ADMIN';
const manager = () => state.me?.role === 'MANAGER';
const operator = () => state.me?.role === 'OPERATOR';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const notice = (message, isError = false) => {
  const el = $('#notice');
  el.textContent = message;
  el.classList.toggle('notice-error', Boolean(message && isError));
};
const titles = {drones: 'Phương tiện', flights: 'Kế hoạch bay', geozones: 'Vùng cấm bay', monitoring: 'Giám sát chuyến bay', users: 'Người dùng', roles: 'Vai trò', logs: 'Nhật ký hệ thống', integrations: 'Tích hợp'};
const descriptions = {
  drones: 'Khai báo hồ sơ UAV trước khi lập kế hoạch bay.',
  flights: 'Nộp quỹ đạo 4D và theo dõi trạng thái phê duyệt.',
  geozones: 'Tra cứu và quản lý vùng cấm bay (NFZ/Restricted) và hạn chế động (UVR/TFR).',
  monitoring: 'Theo dõi vị trí UAV trực tiếp, dự đoán 12s tới và hành lang bay nhận từ Khối 4 (Nhật Anh).',
  users: 'Tra cứu thông tin và quản lý tài khoản trong hệ thống.',
  roles: 'Quản lý danh mục vai trò của người dùng.',
  logs: 'Tra cứu lịch sử thao tác, chuyến bay và các thay đổi trong hệ thống.',
  integrations: 'Theo dõi kế hoạch đã gửi đến mô phỏng và giám sát.'
};
const labels = {PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', ACTIVE: 'Đang bay', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy'};
const droneTypes = {MULTIROTOR: 'Multirotor · Đa cánh quạt', FIXED_WING: 'Fixed-wing · Cánh bằng', HYBRID: 'Hybrid VTOL · Lai VTOL'};
const deliveryLabels = {PENDING: 'Đang chờ', MOCK_DELIVERED: 'Mock đã nhận', DELIVERED: 'Đã chuyển thành công', SUPERSEDED: 'Đã có bản tin mới hơn', FAILED: 'Lỗi chuyển dữ liệu'};
const targetLabels = {SIMULATION: 'Mô phỏng', MONITORING: 'Giám sát'};

async function api(path, method = 'GET', body) {
  const generation = state.generation;
  const response = await fetch('/api' + path, {
    method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const text = response.status === 204 ? '' : await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = {message: text}; }
  }
  if (!response.ok) {
    if (response.status === 401 && state.me && generation === state.generation) showAuth();
    throw new Error(data?.message || `Yêu cầu không thành công (${response.status})`);
  }
  return data;
}

async function run(action, button) {
  if (button) button.disabled = true;
  notice('');
  try { await action(); } catch (error) { notice(error.message, true); }
  finally { if (button) button.disabled = false; }
}

function formData(form) { return Object.fromEntries(new FormData(form)); }
function stopMonitoringFeedPolling() {
  if (monitoringFeedTimer) {
    clearInterval(monitoringFeedTimer);
    monitoringFeedTimer = null;
  }
}

function showAuth() {
  stopMonitoringFeedPolling();
  state.generation++;
  state.loadId++;
  state.me = null;
  state.review = null;
  state.rows = [];
  state.myDroneSerials = new Set();
  state.page = 0;
  state.totalPages = 0;
  $('#list').replaceChildren();
  $('#pageInfo').textContent = '';
  $('#droneSelect').replaceChildren();
  $('#roleSelect').replaceChildren();
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('#deliveryContent').replaceChildren();
  $('#authRoot').hidden = false;
  $('#appShell').hidden = true;
  document.querySelectorAll('#appShell form').forEach(form => form.reset());
  document.querySelectorAll('[data-auth]').forEach(element => element.classList.toggle('active', element.dataset.auth === 'login'));
  $('#loginForm').hidden = false;
  $('#registerForm').hidden = true;
}

async function enter(me) {
  const generation = ++state.generation;
  state.me = me;
  $('#authRoot').hidden = true;
  $('#appShell').hidden = false;
  $('#identity').textContent = me.displayName || me.fullName;
  $('#roleName').textContent = me.role;
  document.querySelectorAll('[data-staff]').forEach(element => element.hidden = !staff());
  document.querySelectorAll('[data-admin]').forEach(element => element.hidden = !admin());
  document.querySelectorAll('[data-manager]').forEach(element => element.hidden = !manager());
  document.querySelectorAll('[data-operator]').forEach(element => element.hidden = !operator());
  $('#droneFormCard').hidden = !operator();
  $('#droneFormTitle').textContent = operator() ? 'Khai báo phương tiện' : 'Cập nhật hồ sơ phương tiện';
  $('#droneReset').textContent = operator() ? 'Nhập mới' : 'Hủy chỉnh sửa';
  $('#portalLabel').textContent = admin() ? 'CỔNG ĐIỀU PHỐI (ADMIN)' : manager() ? 'CỔNG QUẢN LÝ NHÀ NƯỚC' : 'CỔNG NGƯỜI VẬN HÀNH';
  $('#portalBadge').textContent = admin() ? '● Khu vực phê duyệt & điều phối' : manager() ? '● Khu vực không phận & hậu kiểm' : '● Khu vực đăng ký & vận hành bay';
  $('#nav [data-tab="flights"]').textContent = admin() ? '✓ Duyệt kế hoạch bay' : manager() ? '◎ Hậu kiểm kế hoạch bay' : '↗ Kế hoạch bay của tôi';
  $('#nav [data-tab="drones"]').textContent = staff() ? '◎ Quản lý phương tiện' : '◎ Phương tiện của tôi';
  $('#nav [data-tab="logs"]').textContent = staff() ? '≡ Nhật ký' : '≡ Lịch sử của tôi';
  await choices();
  if (generation !== state.generation) return;
  await tab(staff() ? 'flights' : 'drones');
}

async function allPages(path) {
  const rows = [];
  let page = 0, result;
  do {
    result = await api(`${path}${path.includes('?') ? '&' : '?'}size=100&page=${page++}`);
    rows.push(...result.content);
  } while (page < result.totalPages);
  return rows;
}

async function choices() {
  const generation = state.generation;
  const selectedDrones = new Set(Array.from($('#droneSelect').selectedOptions, option => option.value));
  const drones = operator() ? await allPages('/drones/owner/' + state.me.id) : [];
  if (generation !== state.generation) return;
  state.myDroneSerials = new Set(drones.map(drone => drone.serialNumber));
  const autoSelectSingle = drones.length === 1 && selectedDrones.size === 0;
  $('#droneSelect').innerHTML = drones.map(drone =>
    `<option value="${escape(drone.id)}"${(selectedDrones.has(drone.id) || autoSelectSingle) ? ' selected' : ''}>${escape(drone.serialNumber)} · ${escape(droneTypes[drone.droneType] || 'Chưa khai báo loại')} · ${escape(drone.model)}</option>`).join('');
  updateUavCount();
  if (admin()) {
    const selectedRole = $('#roleSelect').value;
    const roles = await allPages('/roles');
    if (generation !== state.generation) return;
    $('#roleSelect').innerHTML = roles.map(role => `<option value="${role.id}">${escape(role.name)} (${escape(role.code)})</option>`).join('');
    if (selectedRole) $('#roleSelect').value = selectedRole;
  }
}

async function tab(name) {
  if ((['users', 'integrations'].includes(name) && !staff()) || (name === 'roles' && !admin())) return;
  state.tab = name;
  state.page = 0;
  state.rows = [];
  $('#sharedListCard').hidden = name === 'monitoring';
  $('#exportFlightsCsv').hidden = !['flights', 'logs'].includes(name);
  $('#list').innerHTML = '<p class="empty">Đang tải dữ liệu…</p>';
  $('#pageInfo').textContent = '';
  $('#keyword').value = '';
  $('#activeFilter').value = 'true';
  $('#lockedFilter').value = '';
  $('#lockedFilter').hidden = name !== 'users';
  $('#flightFilter').value = name === 'flights' && admin() ? 'PENDING' : '';
  $('#flightFilter').hidden = name !== 'flights';
  $('#integrationFilter').hidden = name !== 'integrations';
  $('#activeFilter').hidden = name === 'integrations';
  $('#sortFilter').hidden = name === 'integrations';
  document.querySelectorAll('#nav button').forEach(button => button.classList.toggle('active', button.dataset.tab === name));
  Object.keys(titles).forEach(key => $('#' + key + 'Panel').hidden = key !== name);
  $('#pageTitle').textContent = name === 'flights' ? (admin() ? 'Duyệt và thu hồi phép bay' : manager() ? 'Giám sát & Hậu kiểm kế hoạch bay' : 'Kế hoạch bay của tôi') : (name === 'logs' && operator() ? 'Lịch sử chuyến bay & thao tác của tôi' : titles[name]);
  $('#pageDescription').textContent = name === 'flights' && staff()
    ? (admin() ? 'Xét duyệt, từ chối hoặc thu hồi phép bay.' : 'Theo dõi toàn bộ kế hoạch bay để hậu kiểm và xuất báo cáo.')
    : name === 'drones' && staff() ? 'Tra cứu toàn bộ UAV trong hệ thống.' : descriptions[name];
  $('#listTitle').textContent = 'Danh sách ' + (name === 'logs' && operator() ? 'lịch sử của tôi' : titles[name].toLowerCase());
  $('#keyword').hidden = !['drones', 'geozones', 'users', 'logs'].includes(name);
  $('#keyword').placeholder = {drones: 'Tìm số sê-ri', geozones: 'Tìm mã vùng hoặc tên vùng', users: 'Tên đăng nhập, họ tên hoặc email', logs: 'Mã hành động, ví dụ FLIGHT_SUBMIT'}[name] || '';
  stopMonitoringFeedPolling();
  if (name === 'monitoring') {
    const scopeEl = $('#monitoringScopeNote');
    if (scopeEl) {
      scopeEl.textContent = operator()
        ? 'Phạm vi quyền (Operator): chỉ hiển thị Telemetry & thông tin chuyến bay thuộc các UAV của chính bạn.'
        : 'Phạm vi quyền (Toàn hệ thống): hiển thị Telemetry trực tuyến của toàn bộ UAV đang hoạt động.';
    }
    await loadMonitoringFeed();
    monitoringFeedTimer = setInterval(() => {
      if (state.tab === 'monitoring' && state.me) loadMonitoringFeed().catch(() => {});
    }, 2000);
  } else {
    await load();
  }
}

async function loadMonitoringFeed() {
  const statusEl = $('#monitoringFeedStatus');
  const progEl = $('#monitoringProgressTable');
  const decEl = $('#monitoringDecisionsTable');
  if (!statusEl || !progEl || !decEl) return;
  try {
    const feed = await api('/integration/monitoring-feed');
    const active = Array.isArray(feed.activeUavs) ? feed.activeUavs : [];
    const decisions = Array.isArray(feed.recentDecisions) ? feed.recentDecisions : [];
    const totalProg = feed.totalProgressReceived || 0;
    const totalDec = feed.totalDecisionsReceived || 0;
    statusEl.textContent = active.length
      ? `● Đang nhận live · ${active.length} UAV · ${totalProg} gói tiến độ · ${totalDec} quyết định`
      : `● Sẵn sàng nhận từ Khối 4 (:3000) · ${totalProg} gói tiến độ`;

    progEl.innerHTML = active.length
      ? `<table><thead><tr><th>UAV / Mã kế hoạch</th><th>Vị trí hiện tại (AGL)</th><th>Dự đoán 12s tới</th><th>Tiến độ / Hành lang</th><th>Độ trễ / Cập nhật</th></tr></thead><tbody>${active.map(item => {
          const cur = item.currentPosition || {};
          const pred = item.predictedNextPosition || null;
          const rp = item.routeProgress || {};
          const lq = item.linkQuality || {};
          const corridorBadge = rp.withinCorridor === false
            ? '<span class="badge FAILED">Lệch hành lang</span>'
            : '<span class="badge APPROVED">Trong hành lang</span>';
          const predHtml = pred
            ? `${Number(pred.latitude).toFixed(5)}, ${Number(pred.longitude).toFixed(5)}<small>Độ cao: ${Math.round(Number(pred.altitudeM || 0))} m · +${pred.lookaheadSec || 12}s</small>`
            : '<small>Đang ổn định / chưa ngoại suy</small>';
          const isMine = state.myDroneSerials.has(item.droneId) || state.myDroneSerials.has(item.callsign);
          const ownerBadge = isMine ? ' <span class="badge APPROVED">UAV của bạn</span>' : '';
          return `<tr>
            <td><b>${escape(item.callsign || item.droneId)}</b>${ownerBadge}<small>${escape(item.droneId)}</small><small>KH: ${escape(item.flightId || 'UNLINKED')}</small></td>
            <td>${Number(cur.latitude || 0).toFixed(5)}, ${Number(cur.longitude || 0).toFixed(5)}<small>${Number(cur.altitudeM || 0).toFixed(1)} m ${escape(cur.altitudeReference || 'AGL')} · ${Number(cur.groundSpeedMps || 0).toFixed(1)} m/s · ${cur.headingDeg ?? 0}°</small></td>
            <td>${predHtml}</td>
            <td><b>${rp.progressPercent ?? 0}%</b> · ${escape(rp.currentLegLabel || '')}<br>${corridorBadge}<small>Lệch ngang: ${rp.horizontalDeviationM ?? 0} m · Cao: ${rp.verticalDeviationM ?? 0} m</small></td>
            <td>${lq.latencyMs ?? 0} ms (${escape(lq.freshness || 'FRESH')})<small>${item.receivedAtUtc ? escape(formatTime(item.receivedAtUtc)) : ''}</small></td>
          </tr>`;
        }).join('')}</tbody></table>`
      : '<p class="empty">Chưa nhận báo cáo giám sát nào từ Khối 4.</p>';

    decEl.innerHTML = decisions.length
      ? `<table><thead><tr><th>Thời gian</th><th>UAV / Mã kế hoạch</th><th>Loại lệnh</th><th>Nội dung điều phối</th><th>Lý do</th></tr></thead><tbody>${decisions.map(dec => `<tr>
          <td>${escape(formatTime(dec.timestampUtc || dec.receivedAtUtc || new Date().toISOString()))}</td>
          <td><b>${escape(dec.droneId)}</b><small>KH: ${escape(dec.flightId || 'UNLINKED')}</small></td>
          <td><span class="badge APPROVED">${escape(dec.actionType || 'DECISION')}</span><small>${escape(dec.decisionStatus || '')}</small></td>
          <td>${escape(dec.instructionSummary || '')}</td>
          <td>${escape(dec.reason || '')}</td>
        </tr>`).join('')}</tbody></table>`
      : '<p class="empty">Chưa có quyết định điều phối nào.</p>';
  } catch (err) {
    statusEl.textContent = '⚠ Không tải được phản hồi giám sát: ' + err.message;
  }
}

const actionButton = (action, id, label) => `<button type="button" data-action="${action}" data-id="${id}">${label}</button>`;
const formatTime = time => new Date(time).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
const toUtc = time => new Date(time.length === 16 ? time + ':00+07:00' : time + '+07:00').toISOString();
function prettyJson(json) { try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; } }
const routeName = row => `${row.departureName || 'Điểm đi chưa đặt tên'} → ${row.destinationName || 'Điểm đến chưa đặt tên'}`;
function routePreview(row) {
  try {
    const points = JSON.parse(row.trajectoryJson);
    if (!Array.isArray(points)) return '';
    return `<ol class="route-points">${points.map((point, index) => `<li><b>${index === 0 ? 'Điểm đi' : index === points.length - 1 ? 'Điểm đến' : 'Điểm ' + (index + 1)}</b> ${escape(point.latitude)}, ${escape(point.longitude)} · ${escape(point.altitude)} m ${escape(row.altitudeReference || 'AMSL')}<small>${escape(formatTime(point.time))}</small></li>`).join('')}</ol>`;
  } catch { return '<p>Không đọc được lộ trình.</p>'; }
}
function deliveryDetails(row) {
  return `<article class="delivery-record"><h3>${escape(targetLabels[row.target] || row.target)} · ${escape(deliveryLabels[row.status] || row.status)}</h3><p>${escape(row.eventType)} · ${escape(row.attempts)} lần gửi</p><p>Mã bản tin: ${escape(row.id)}</p>${row.deliveredAt ? `<p>Tiếp nhận: ${escape(formatTime(row.deliveredAt))}</p>` : ''}${row.lastError ? `<p class="delivery-error">${escape(row.lastError)}</p>` : ''}${row.receipt ? `<p>Phản hồi: ${escape(row.receipt)}</p>` : ''}<details><summary>Dữ liệu chuyển đi</summary><pre>${escape(prettyJson(row.payloadJson))}</pre></details></article>`;
}

function renderRow(row) {
  const id = row.id;
  const active = row.isActive && !row.deletedAt;
  const detail = `<small>${escape(id)}</small>`;
  if (state.tab === 'drones') {
    return `<td>${escape(row.serialNumber)}${detail}</td><td>${escape(row.model)}<small>${escape(droneTypes[row.droneType] || 'Chưa khai báo loại')}</small><small>${escape(row.owner.companyName || row.owner.fullName)}</small></td><td>${row.maxFlightTime} phút · ${row.maxSpeed} m/s</td><td>${active ? actionButton('edit', id, 'Sửa') + actionButton('delete', id, 'Xóa mềm') : actionButton('restore', id, 'Khôi phục')}</td>`;
  }
  if (state.tab === 'flights') {
    let actions = '';
    if (active && admin()) {
      if (row.status === 'PENDING') {
        actions += actionButton('status:APPROVED', id, 'Duyệt') + actionButton('status:REJECTED', id, 'Từ chối');
      } else if (['APPROVED', 'ACTIVE'].includes(row.status)) {
        actions += actionButton('revoke', id, 'Thu hồi phép bay');
      }
    }
    if (active && operator() && row.operator.id === state.me.id) {
      if (row.status === 'APPROVED') actions += actionButton('status:ACTIVE', id, '▶ Bắt đầu bay');
      if (row.status === 'ACTIVE') actions += actionButton('status:COMPLETED', id, '■ Kết thúc bay');
      if (['PENDING', 'APPROVED'].includes(row.status) && new Date(row.startTime) > new Date()) {
        actions += actionButton('cancel', id, 'Hủy kế hoạch');
      }
    }
    if (!active && admin()) actions += actionButton('restore', id, 'Khôi phục');
    if (active && ['APPROVED', 'ACTIVE', 'COMPLETED'].includes(row.status)) actions += actionButton('download-plan', id, 'Tải lộ trình đã duyệt');
    actions += actionButton('integration', id, 'Xem chuyển dữ liệu');
    return `<td>${escape(row.drone.serialNumber)}${detail}<small>${escape(row.operator.companyName || row.operator.fullName)}</small>${row.submissionId ? `<small>Đợt gửi ${escape(row.submissionId)} · ${escape(row.uavCount)} UAV, duyệt riêng từng UAV</small>` : ''}</td><td><b>${escape(routeName(row))}</b><small>Cất cánh ${escape(formatTime(row.startTime))}</small><small>Hạ cánh ${escape(formatTime(row.endTime))}</small></td><td><span class="badge ${row.status}">${labels[row.status]}</span>${row.reviewedAt ? `<small>Xét duyệt ${escape(formatTime(row.reviewedAt))}</small>` : ''}${row.reviewedBy ? `<small>Người xét duyệt: ${escape(row.reviewedBy)}</small>` : ''}${row.reviewNote ? `<p class="review-note">${escape(row.reviewNote)}</p>` : ''}<details><summary>Xem lộ trình · ${escape(row.altitudeReference || 'AMSL')}</summary>${routePreview(row)}<details><summary>JSON quỹ đạo 4D</summary><pre>${escape(prettyJson(row.trajectoryJson))}</pre></details></details></td><td>${actions}</td>`;
  }
  if (state.tab === 'geozones') {
    const zoneClass = row.zoneType === 'NFZ' ? 'REJECTED' : row.zoneType === 'TFR_UVR' ? 'FAILED' : 'PENDING';
    const actions = manager()
      ? (active ? actionButton('edit', id, 'Sửa') + actionButton('delete', id, 'Xóa mềm') : actionButton('restore', id, 'Khôi phục'))
      : '<small>Chỉ xem (R)</small>';
    const windowStr = (row.effectiveFrom || row.effectiveTo)
      ? `<small>Hiệu lực: ${row.effectiveFrom ? escape(formatTime(row.effectiveFrom)) : '...'} → ${row.effectiveTo ? escape(formatTime(row.effectiveTo)) : '...'}</small>`
      : '<small>Hiệu lực thường xuyên</small>';
    return `<td><b>${escape(row.code)}</b>${detail}<span class="badge ${zoneClass}">${escape(row.zoneType)} · ${escape(row.category)}</span></td><td><b>${escape(row.name)}</b><small>${escape(row.description || '')}</small>${windowStr}</td><td>${row.centerLat}, ${row.centerLng}<small>Bán kính ${row.radiusMeters} m · Trần ${row.minAltitudeM}–${row.maxAltitudeM} m AGL</small></td><td>${actions}</td>`;
  }
  if (state.tab === 'users') {
    const actions = admin() && active ? actionButton('edit', id, 'Sửa') + (id !== state.me.id ? actionButton(row.isLocked ? 'unlock' : 'lock', id, row.isLocked ? 'Mở khóa' : 'Khóa') + actionButton('delete', id, 'Xóa mềm') : '') : '';
    return `<td>${escape(row.username)}${detail}</td><td>${escape(row.companyName || row.fullName)}<small>${row.accountType === 'BUSINESS' ? 'Doanh nghiệp · ' + escape(row.taxCode) : 'Cá nhân'}</small><small>${escape(row.email)}</small></td><td>${escape(row.role.code)}<small>${row.isLocked ? 'Đang khóa' : 'Không khóa'}</small></td><td>${actions}</td>`;
  }
  if (state.tab === 'roles') {
    const actions = active ? actionButton('edit', id, 'Sửa') + (!row.isSystem ? actionButton('delete', id, 'Xóa mềm') : '') : actionButton('restore', id, 'Khôi phục');
    return `<td>${escape(row.code)}${detail}</td><td>${escape(row.name)}<small>${escape(row.description)}</small></td><td>${row.isSystem ? 'Vai trò hệ thống' : 'Vai trò tùy chỉnh'}</td><td>${actions}</td>`;
  }
  if (state.tab === 'integrations') {
    return `<td>${escape(formatTime(row.createdAt))}<small>${escape(row.id)}</small></td><td>${escape(targetLabels[row.target] || row.target)}<small>${escape(row.eventType)}</small><small>Kế hoạch ${escape(row.flightId)}</small></td><td><span class="badge ${escape(row.status)}">${escape(deliveryLabels[row.status] || row.status)}</span><small>${escape(row.attempts)} lần gửi</small>${row.lastError ? `<small>${escape(row.lastError)}</small>` : ''}</td><td>${actionButton('delivery-details', id, 'Xem bản tin')}${admin() && !['DELIVERED', 'SUPERSEDED'].includes(row.status) ? actionButton('retry', id, 'Gửi lại') : ''}</td>`;
  }
  return `<td>${escape(formatTime(row.createdAt))}</td><td>${escape(row.user?.username || 'Hệ thống')}</td><td>${escape(row.actionType)}</td><td>${escape(row.details)}</td>`;
}

async function load() {
  if (!state.me) return;
  const generation = state.generation, loadId = ++state.loadId;
  const requestedTab = state.tab;
  const params = new URLSearchParams({page: state.page, size: $('#sizeFilter').value, sort: $('#sortFilter').value, isActive: $('#activeFilter').value});
  let path = '/' + (requestedTab === 'logs' && !staff() ? 'logs/my' : requestedTab);
  const keyword = $('#keyword').value.trim();
  if (keyword && requestedTab === 'drones') { path += '/search'; params.set('serialNumber', keyword); }
  if (keyword && (requestedTab === 'users' || requestedTab === 'geozones')) params.set('keyword', keyword);
  if (requestedTab === 'users' && $('#lockedFilter').value) params.set('isLocked', $('#lockedFilter').value);
  if (requestedTab === 'flights' && $('#flightFilter').value === 'approved') path += '/active-or-approved';
  if (requestedTab === 'flights' && $('#flightFilter').value && $('#flightFilter').value !== 'approved') params.set('status', $('#flightFilter').value);
  if (keyword && requestedTab === 'logs') { if (staff()) path += '/action'; params.set('type', keyword); }
  let result;
  if (requestedTab === 'integrations') {
    const filter = $('#integrationFilter').value;
    const deliveries = await api('/integrations' + (filter ? '?status=' + encodeURIComponent(filter) : ''));
    if (state.tab !== requestedTab || generation !== state.generation || loadId !== state.loadId) return;
    const size = Number($('#sizeFilter').value);
    const totalPages = Math.ceil(deliveries.length / size);
    state.page = Math.min(state.page, Math.max(0, totalPages - 1));
    result = {content: deliveries.slice(state.page * size, (state.page + 1) * size), page: state.page, totalPages, totalElements: deliveries.length};
  } else result = await api(path + '?' + params);
  if (state.tab !== requestedTab || generation !== state.generation || loadId !== state.loadId) return;
  state.rows = result.content;
  state.totalPages = result.totalPages;
  const headings = {
    drones: ['Số sê-ri', 'Phương tiện / Chủ sở hữu', 'Thông số', 'Thao tác'],
    flights: ['Phương tiện / Người vận hành', 'Lộ trình / Thời gian', 'Trạng thái / Kết quả duyệt', 'Thao tác'],
    geozones: ['Mã vùng / Loại', 'Tên & Mô tả vùng', 'Tâm / Bán kính / Trần bay', 'Thao tác'],
    users: ['Tên đăng nhập', 'Người dùng', 'Vai trò / Trạng thái', 'Thao tác'],
    roles: ['Mã vai trò', 'Thông tin', 'Loại', 'Thao tác'],
    logs: ['Thời gian', 'Người thực hiện', 'Hành động', 'Chi tiết'],
    integrations: ['Thời gian / Bản tin', 'Đầu nhận / Kế hoạch', 'Trạng thái', 'Thao tác']
  }[state.tab];
  $('#list').innerHTML = result.content.length ? `<table><thead><tr>${headings.map(heading => `<th>${heading}</th>`).join('')}</tr></thead><tbody>${result.content.map(row => `<tr>${renderRow(row)}</tr>`).join('')}</tbody></table>` : '<p class="empty">Chưa có dữ liệu phù hợp.</p>';
  $('#pageInfo').textContent = `Trang ${result.totalPages ? result.page + 1 : 0}/${result.totalPages} · ${result.totalElements} bản ghi`;
  $('#previous').disabled = state.page === 0;
  $('#next').disabled = state.page + 1 >= result.totalPages;
}

document.querySelectorAll('[data-auth]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-auth]').forEach(element => element.classList.toggle('active', element.dataset.auth === button.dataset.auth));
  $('#loginForm').hidden = button.dataset.auth !== 'login';
  $('#registerForm').hidden = button.dataset.auth !== 'register';
  notice('');
}));

function updateRegistrationType() {
  const business = $('#registerForm [name="accountType"]:checked').value === 'BUSINESS';
  $('#individualFields').hidden = business;
  $('#individualFields').disabled = business;
  $('#businessFields').hidden = !business;
  $('#businessFields').disabled = !business;
  $('#registerForm [name="address"]').required = business;
}
document.querySelectorAll('#registerForm [name="accountType"]').forEach(input => input.addEventListener('change', updateRegistrationType));
updateRegistrationType();

for (const type of ['login', 'register']) $('#' + type + 'Form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    const data = formData(form);
    if (type === 'register' && data.password !== data.confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
    delete data.confirmPassword;
    const me = await api('/auth/' + type, 'POST', data);
    form.reset();
    if (type === 'register') updateRegistrationType();
    await enter(me);
  }, event.submitter);
});

$('#logout').onclick = () => run(async () => { await api('/auth/logout', 'POST'); showAuth(); });
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => run(() => tab(button.dataset.tab), button));
document.querySelectorAll('[data-reset]').forEach(button => button.onclick = () => {
  const form = $('#' + button.dataset.reset); form.reset(); form.elements.id.value = '';
  if (button.dataset.reset === 'droneForm' && !operator()) $('#droneFormCard').hidden = true;
});

for (const [name, path] of [['drone', 'drones'], ['user', 'users'], ['role', 'roles'], ['geozone', 'geozones']]) $('#' + name + 'Form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    const data = formData(form), id = data.id;
    delete data.id;
    if (name === 'drone') {
      data.maxFlightTime = Number(data.maxFlightTime); data.maxSpeed = Number(data.maxSpeed);
      if (!droneTypes[data.droneType]) throw new Error('Vui lòng chọn loại UAV.');
      if (!Number.isSafeInteger(data.maxFlightTime) || data.maxFlightTime < 1) throw new Error('Thời gian bay phải là số phút nguyên lớn hơn 0.');
      if (!Number.isFinite(data.maxSpeed) || data.maxSpeed <= 0) throw new Error('Tốc độ tối đa phải lớn hơn 0 m/s.');
    }
    if (name === 'geozone') {
      data.centerLat = Number(data.centerLat); data.centerLng = Number(data.centerLng);
      data.radiusMeters = Number(data.radiusMeters);
      data.minAltitudeM = Number(data.minAltitudeM || 0); data.maxAltitudeM = Number(data.maxAltitudeM || 120);
      data.effectiveFrom = data.effectiveFrom ? parseLocalUtcIso(data.effectiveFrom) : null;
      data.effectiveTo = data.effectiveTo ? parseLocalUtcIso(data.effectiveTo) : null;
    }
    if (name === 'user' && !data.password) delete data.password;
    await api('/' + path + (id ? '/' + id : ''), id ? 'PUT' : 'POST', data);
    form.reset(); form.elements.id.value = '';
    if (name === 'drone' && !operator()) $('#droneFormCard').hidden = true;
    await choices(); await load(); notice('Đã lưu thông tin.');
  }, event.submitter);
});

$('#dronePreset').onclick = () => {
  const form = $('#droneForm');
  const profiles = {MULTIROTOR: {maxFlightTime: 25, maxSpeed: 20}, FIXED_WING: {maxFlightTime: 60, maxSpeed: 30}, HYBRID: {maxFlightTime: 45, maxSpeed: 26}};
  const profile = profiles[form.elements.droneType.value];
  if (!profile) { notice('Chọn loại UAV trước khi điền thông số mô phỏng.'); return; }
  for (const [key, value] of Object.entries(profile)) if (!form.elements[key].value) form.elements[key].value = value;
  notice('Đã điền các ô thông số còn trống bằng cấu hình mô phỏng của đề tài.');
};

function updateUavCount() {
  $('#uavCount').textContent = `Đã chọn ${$('#droneSelect').selectedOptions.length} UAV`;
}
$('#droneSelect').onchange = updateUavCount;

function formatLocalDateTime(date) {
  const utc7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return utc7.toISOString().slice(0, 16);
}

function parseLocalUtcIso(timeStr) {
  const raw = String(timeStr || '').trim();
  if (!raw) return null;
  const normalized = raw.length === 16 ? raw + ':00+07:00' : (raw.includes('+') || raw.endsWith('Z') ? raw : raw + '+07:00');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function showFlightError(message, focusEl) {
  const errBox = $('#flightFormError');
  if (errBox) {
    errBox.textContent = message || '';
    errBox.hidden = !message;
  }
  if (message && focusEl && typeof focusEl.focus === 'function') focusEl.focus();
}

function syncEndpointWaypointTimes() {
  const form = $('#flightForm');
  const rows = Array.from(document.querySelectorAll('#waypoints .waypoint'));
  if (!form || rows.length < 2) return;
  const startVal = form.elements.startTime.value;
  const endVal = form.elements.endTime.value;
  const firstInput = rows[0].querySelector('input[data-field="time"]');
  const lastInput = rows[rows.length - 1].querySelector('input[data-field="time"]');
  if (startVal && firstInput) firstInput.value = startVal;
  if (endVal && lastInput) lastInput.value = endVal;
}

function addWaypoint() {
  const row = document.createElement('div');
  row.className = 'waypoint';
  row.innerHTML = '<label>Vĩ độ<input data-field="latitude" type="number" min="-90" max="90" step="any" required></label><label>Kinh độ<input data-field="longitude" type="number" min="-180" max="180" step="any" required></label><label>Độ cao (m AGL)<input data-field="altitude" type="number" min="0" max="120" step="any" required></label><label>Thời gian (UTC+7)<input data-field="time" type="datetime-local" required></label><button type="button" aria-label="Xóa waypoint">×</button>';
  row.querySelector('button').onclick = () => {
    if ($('#waypoints').children.length > 2) { row.remove(); syncEndpointWaypointTimes(); }
    else notice('Cần ít nhất 2 waypoint.', true);
  };
  $('#waypoints').append(row);
  syncEndpointWaypointTimes();
}
$('#addWaypoint').onclick = addWaypoint;
addWaypoint(); addWaypoint();

$('#flightForm').elements.startTime.addEventListener('change', syncEndpointWaypointTimes);
$('#flightForm').elements.endTime.addEventListener('change', syncEndpointWaypointTimes);

$('#fillSampleRoute').onclick = () => {
  const form = $('#flightForm');
  showFlightError('');
  if ($('#droneSelect').options.length > 0 && $('#droneSelect').selectedOptions.length === 0) {
    $('#droneSelect').options[0].selected = true;
    updateUavCount();
  }
  const now = Date.now();
  const startLocal = formatLocalDateTime(new Date(now + 5 * 60 * 1000));
  const midLocal = formatLocalDateTime(new Date(now + 12 * 60 * 1000));
  const endLocal = formatLocalDateTime(new Date(now + 20 * 60 * 1000));
  form.elements.departureName.value = 'Vertiport Cầu Rồng (Mặt đất), Đà Nẵng';
  form.elements.destinationName.value = 'Công viên Bờ Đông (Mặt đất), Đà Nẵng';
  form.elements.startTime.value = startLocal;
  form.elements.endTime.value = endLocal;

  const wpBox = $('#waypoints');
  while (wpBox.children.length > 3) wpBox.lastElementChild.remove();
  while (wpBox.children.length < 3) addWaypoint();
  const samplePts = [
    {latitude: '16.0612', longitude: '108.2245', altitude: '78', time: startLocal},
    {latitude: '16.0612', longitude: '108.2253', altitude: '82', time: midLocal},
    {latitude: '16.0646', longitude: '108.2278', altitude: '84', time: endLocal}
  ];
  Array.from(wpBox.querySelectorAll('.waypoint')).forEach((row, idx) => {
    const sample = samplePts[idx];
    for (const [k, v] of Object.entries(sample)) {
      const inp = row.querySelector(`input[data-field="${k}"]`);
      if (inp) inp.value = v;
    }
  });
  notice('Đã điền lộ trình mẫu Đà Nẵng (Vertiport Cầu Rồng → Trên vòm Cầu Rồng → Công viên Bờ Đông). Nhấn "Nộp kế hoạch chờ duyệt" để gửi.');
};

$('#flightForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  showFlightError('');
  run(async () => {
    const data = formData(form);
    const select = $('#droneSelect');
    if (select.selectedOptions.length === 0 && select.options.length === 1) {
      select.options[0].selected = true;
      updateUavCount();
    }
    data.droneIds = Array.from(select.selectedOptions, option => option.value);
    if (!data.droneIds.length) {
      const msg = select.options.length
        ? 'Vui lòng chọn ít nhất một UAV tham gia trong danh sách.'
        : 'Tài khoản chưa có UAV nào. Hãy khai báo UAV ở tab Phương tiện trước.';
      showFlightError(msg, select);
      throw new Error(msg);
    }
    if (data.droneIds.length > 50) {
      const msg = 'Mỗi đợt gửi có tối đa 50 UAV.';
      showFlightError(msg, select);
      throw new Error(msg);
    }

    data.departureName = String(data.departureName || '').trim();
    data.destinationName = String(data.destinationName || '').trim();
    if (!data.departureName) {
      const msg = 'Vui lòng nhập Điểm đi.';
      showFlightError(msg, form.elements.departureName);
      throw new Error(msg);
    }
    if (!data.destinationName) {
      const msg = 'Vui lòng nhập Điểm đến.';
      showFlightError(msg, form.elements.destinationName);
      throw new Error(msg);
    }

    const startUtc = parseLocalUtcIso(data.startTime);
    const endUtc = parseLocalUtcIso(data.endTime);
    if (!startUtc) {
      const msg = 'Vui lòng chọn giờ Cất cánh dự kiến (UTC+7).';
      showFlightError(msg, form.elements.startTime);
      throw new Error(msg);
    }
    if (!endUtc) {
      const msg = 'Vui lòng chọn giờ Hạ cánh dự kiến (UTC+7).';
      showFlightError(msg, form.elements.endTime);
      throw new Error(msg);
    }
    const startMs = Date.parse(startUtc), endMs = Date.parse(endUtc);
    if (startMs <= Date.now()) {
      const msg = 'Giờ cất cánh dự kiến phải lớn hơn thời điểm hiện tại (ở tương lai).';
      showFlightError(msg, form.elements.startTime);
      throw new Error(msg);
    }
    if (endMs <= startMs) {
      const msg = 'Giờ hạ cánh phải sau giờ cất cánh.';
      showFlightError(msg, form.elements.endTime);
      throw new Error(msg);
    }

    const rows = Array.from(document.querySelectorAll('#waypoints .waypoint'));
    if (rows.length < 2) {
      const msg = 'Cần ít nhất 2 waypoint (điểm đi và điểm đến).';
      showFlightError(msg);
      throw new Error(msg);
    }
    // Auto-fill missing waypoint times cleanly
    rows.forEach((row, idx) => {
      const tInput = row.querySelector('input[data-field="time"]');
      if (tInput && !tInput.value) {
        if (idx === 0) tInput.value = data.startTime;
        else if (idx === rows.length - 1) tInput.value = data.endTime;
        else {
          const interpMs = startMs + ((endMs - startMs) * idx) / (rows.length - 1);
          tInput.value = formatLocalDateTime(new Date(interpMs));
        }
      }
    });

    const points = rows.map((row, idx) => {
      const latInput = row.querySelector('input[data-field="latitude"]');
      const lonInput = row.querySelector('input[data-field="longitude"]');
      const altInput = row.querySelector('input[data-field="altitude"]');
      const timeInput = row.querySelector('input[data-field="time"]');
      const parseNum = (inp, label) => {
        const raw = String(inp?.value ?? '').trim().replace(',', '.');
        if (!raw) {
          const msg = `Waypoint ${idx + 1}: Vui lòng nhập ${label}.`;
          showFlightError(msg, inp);
          throw new Error(msg);
        }
        const num = Number(raw);
        if (!Number.isFinite(num)) {
          const msg = `Waypoint ${idx + 1}: Giá trị ${label} không hợp lệ.`;
          showFlightError(msg, inp);
          throw new Error(msg);
        }
        return num;
      };
      const latitude = parseNum(latInput, 'Vĩ độ');
      const longitude = parseNum(lonInput, 'Kinh độ');
      const altitude = parseNum(altInput, 'Độ cao (m AGL)');
      if (Math.abs(latitude) > 90) {
        const msg = `Waypoint ${idx + 1}: Vĩ độ phải trong khoảng -90 đến 90.`;
        showFlightError(msg, latInput);
        throw new Error(msg);
      }
      if (Math.abs(longitude) > 180) {
        const msg = `Waypoint ${idx + 1}: Kinh độ phải trong khoảng -180 đến 180.`;
        showFlightError(msg, lonInput);
        throw new Error(msg);
      }
      if (altitude < 0 || altitude > 120) {
        const msg = `Waypoint ${idx + 1}: Độ cao mô phỏng phải từ 0 đến 120 m AGL.`;
        showFlightError(msg, altInput);
        throw new Error(msg);
      }
      const timeIso = parseLocalUtcIso(timeInput?.value);
      if (!timeIso) {
        const msg = `Waypoint ${idx + 1}: Vui lòng chọn Thời gian (UTC+7).`;
        showFlightError(msg, timeInput);
        throw new Error(msg);
      }
      return {latitude, longitude, altitude, time: timeIso, _ms: Date.parse(timeIso), _el: timeInput};
    });

    for (let i = 0; i < points.length; i++) {
      if (points[i]._ms < startMs || points[i]._ms > endMs) {
        const msg = `Waypoint ${i + 1}: Thời gian phải nằm trong khoảng từ giờ cất cánh đến hạ cánh.`;
        showFlightError(msg, points[i]._el);
        throw new Error(msg);
      }
      if (i > 0 && points[i]._ms <= points[i - 1]._ms) {
        const msg = `Waypoint ${i + 1}: Thời gian phải lớn hơn Waypoint ${i}.`;
        showFlightError(msg, points[i]._el);
        throw new Error(msg);
      }
    }
    if (points[0]._ms !== startMs || points[points.length - 1]._ms !== endMs) {
      const msg = 'Thời gian waypoint đầu/cuối phải khớp với giờ cất/hạ cánh.';
      showFlightError(msg, points[0]._el);
      throw new Error(msg);
    }

    const cleanPoints = points.map(({latitude, longitude, altitude, time}) => ({latitude, longitude, altitude, time}));
    data.startTime = startUtc;
    data.endTime = endUtc;
    data.trajectoryJson = JSON.stringify(cleanPoints);

    try {
      const flights = await api('/flights/batch', 'POST', data);
      form.reset();
      while ($('#waypoints').children.length > 2) $('#waypoints').lastElementChild.remove();
      while ($('#waypoints').children.length < 2) addWaypoint();
      await choices();
      state.page = 0;
      $('#flightFilter').value = 'PENDING';
      await load();
      notice(`Đã gửi ${flights.length} kế hoạch chờ duyệt thành công. ADMIN sẽ xét duyệt từng UAV.`);
    } catch (err) {
      showFlightError(err.message);
      throw err;
    }
  }, event.submitter);
});

$('#list').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  run(async () => {
    const generation = state.generation;
    const row = state.rows.find(item => item.id === button.dataset.id), action = button.dataset.action;
    if (!row) return;
    if (action === 'download-plan') {
      const plan = await api('/flights/' + row.id + '/accepted-plan');
      if (generation !== state.generation) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], {type: 'application/json;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = 'flightplan-accepted-' + row.id + '.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (action === 'integration' || action === 'delivery-details') {
      const rows = action === 'integration' ? await api('/flights/' + row.id + '/integration') : [row];
      if (generation !== state.generation) return;
      $('#deliveryContent').innerHTML = rows.length ? rows.map(deliveryDetails).join('') : '<p class="muted">Chưa có bản tin chuyển dữ liệu. Kế hoạch được chuyển sau khi ADMIN duyệt.</p>';
      $('#deliveryDialog').showModal(); return;
    }
    if (action === 'retry') {
      await api('/integrations/' + row.id + '/retry', 'POST');
      await load(); notice('Đã xử lý yêu cầu gửi lại. Xem trạng thái và phản hồi của đầu nhận.'); return;
    }
    if (['status:APPROVED', 'status:REJECTED', 'revoke'].includes(action)) {
      const isRevoke = action === 'revoke';
      state.review = {id: row.id, status: isRevoke ? 'REVOKE' : action.split(':')[1]};
      $('#reviewTitle').textContent = isRevoke ? 'Thu hồi phép bay khẩn cấp' : (action === 'status:APPROVED' ? 'Duyệt kế hoạch bay' : 'Từ chối kế hoạch bay');
      $('#reviewRoute').textContent = `${row.drone.serialNumber} · ${routeName(row)} · ${formatTime(row.startTime)}`;
      $('#reviewForm').reset(); $('#reviewDialog').showModal(); return;
    }
    if (action === 'edit') {
      const form = $('#' + {drones: 'drone', users: 'user', roles: 'role', geozones: 'geozone'}[state.tab] + 'Form');
      const values = {...row, roleId: row.role?.id};
      if (state.tab === 'geozones') {
        values.effectiveFrom = row.effectiveFrom ? formatLocalDateTime(new Date(row.effectiveFrom)) : '';
        values.effectiveTo = row.effectiveTo ? formatLocalDateTime(new Date(row.effectiveTo)) : '';
      }
      if (state.tab === 'drones') $('#droneFormCard').hidden = false;
      for (const input of form.elements) if (input.name && input.type !== 'password') input.value = values[input.name] ?? '';
      if (form.elements.password) form.elements.password.value = '';
      form.scrollIntoView({behavior: 'smooth'}); return;
    }
    if (['delete', 'cancel', 'lock'].includes(action) && !confirm('Xác nhận ' + button.textContent.toLowerCase() + '?')) return;
    const path = '/' + state.tab + '/' + row.id;
    if (action === 'delete') await api(path, 'DELETE');
    else if (action.startsWith('status:')) await api(path + '/status', 'PUT', {status: action.split(':')[1]});
    else await api(path + '/' + action, 'PUT');
    await choices(); await load(); notice('Đã cập nhật.');
  }, button);
});

$('#reviewClose').onclick = () => { if (!state.review?.submitting) { state.review = null; $('#reviewDialog').close(); } };
$('#reviewDialog').addEventListener('cancel', event => {
  if (state.review?.submitting) event.preventDefault();
  else state.review = null;
});
$('#deliveryClose').onclick = () => $('#deliveryDialog').close();
$('#reviewForm').addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    if (!state.review || state.review.submitting) return;
    const generation = state.generation, review = state.review;
    review.submitting = true;
    $('#reviewClose').disabled = true;
    try {
      const note = $('#reviewForm').elements.reviewNote.value.trim();
      if (review.status === 'REVOKE') {
        await api('/flights/' + review.id + '/revoke', 'PUT', {reviewNote: note});
      } else {
        await api('/flights/' + review.id + '/status', 'PUT', {status: review.status, reviewNote: note});
      }
      if (generation !== state.generation || state.review !== review) return;
      state.review = null; $('#reviewDialog').close();
      await load();
      notice(review.status === 'REVOKE'
        ? 'Đã thu hồi phép bay và phát bản tin hủy tới Mô phỏng & Giám sát.'
        : (review.status === 'APPROVED' ? 'Đã duyệt. User có thể tải lộ trình; xem chuyển dữ liệu để theo dõi hai đầu nhận.' : 'Đã từ chối và gửi kết quả cho người vận hành.'));
    } finally { review.submitting = false; $('#reviewClose').disabled = false; }
  }, event.submitter);
});

$('#exportFlightsCsv').onclick = () => run(async () => {
  const res = await fetch('/api/flights/export.csv', {credentials: 'same-origin'});
  if (!res.ok) throw new Error('Không xuất được báo cáo CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'utm-flight-history.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$('#clearLogs').onclick = () => run(async () => {
  if (confirm('Xóa mềm nhật ký hiện tại?')) { await api('/logs/clear', 'DELETE'); await load(); }
});
$('#refresh').onclick = () => run(async () => { await choices(); await load(); });
$('#search').onclick = () => run(async () => { state.page = 0; await load(); });
$('#keyword').onkeydown = event => { if (event.key === 'Enter') $('#search').click(); };
for (const selector of ['#activeFilter', '#lockedFilter', '#flightFilter', '#integrationFilter', '#sortFilter', '#sizeFilter'])
  $(selector).onchange = () => $('#search').click();
$('#previous').onclick = () => run(async () => { state.page = Math.max(0, state.page - 1); await load(); });
$('#next').onclick = () => run(async () => { if (state.page + 1 < state.totalPages) state.page++; await load(); });

(async () => {
  try { await enter(await api('/auth/me')); }
  catch (error) { showAuth(); if (!error.message.includes('đăng nhập')) notice(error.message); }
})();
