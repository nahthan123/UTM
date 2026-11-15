'use strict';

const $ = selector => document.querySelector(selector);
const state = {me: null, tab: 'drones', page: 0, rows: [], totalPages: 0, loading: false};
const staff = () => ['ADMIN', 'MANAGER'].includes(state.me?.role);
const admin = () => state.me?.role === 'ADMIN';
const operator = () => state.me?.role === 'OPERATOR';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const notice = message => { $('#notice').textContent = message; };
const titles = {drones: 'Phương tiện', flights: 'Kế hoạch bay', users: 'Người dùng', roles: 'Vai trò', logs: 'Nhật ký hệ thống'};
const descriptions = {
  drones: 'Khai báo hồ sơ UAV trước khi lập kế hoạch bay.',
  flights: 'Nộp quỹ đạo 4D và theo dõi trạng thái phê duyệt.',
  users: 'Tra cứu thông tin và quản lý tài khoản trong hệ thống.',
  roles: 'Quản lý danh mục vai trò của người dùng.',
  logs: 'Tra cứu lịch sử thao tác và các thay đổi trong hệ thống.'
};
const labels = {PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', ACTIVE: 'Đang bay', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy'};
const droneTypes = {MULTIROTOR: 'Đa cánh quạt', FIXED_WING: 'Cánh bằng', HYBRID: 'Hybrid (lai)'};

async function api(path, method = 'GET', body) {
  const response = await fetch('/api' + path, {
    method, credentials: 'same-origin', headers: body ? {'Content-Type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.me) showAuth();
    throw new Error(data?.message || 'Yêu cầu không thành công');
  }
  return data;
}

async function run(action, button) {
  if (button) button.disabled = true;
  notice('');
  try { await action(); } catch (error) { notice(error.message); }
  finally { if (button) button.disabled = false; }
}

function formData(form) { return Object.fromEntries(new FormData(form)); }
function showAuth() {
  state.me = null;
  $('#authRoot').hidden = false;
  $('#appShell').hidden = true;
  document.querySelectorAll('#appShell form').forEach(form => form.reset());
  document.querySelectorAll('[data-auth]').forEach(element => element.classList.toggle('active', element.dataset.auth === 'login'));
  $('#loginForm').hidden = false;
  $('#registerForm').hidden = true;
}

async function enter(me) {
  state.me = me;
  $('#authRoot').hidden = true;
  $('#appShell').hidden = false;
  $('#identity').textContent = me.displayName || me.fullName;
  $('#roleName').textContent = me.role;
  document.querySelectorAll('[data-staff]').forEach(element => element.hidden = !staff());
  document.querySelectorAll('[data-admin]').forEach(element => element.hidden = !admin());
  document.querySelectorAll('[data-operator]').forEach(element => element.hidden = !operator());
  $('#droneFormCard').hidden = !operator();
  $('#droneFormTitle').textContent = operator() ? 'Khai báo phương tiện' : 'Cập nhật hồ sơ phương tiện';
  $('#droneReset').textContent = operator() ? 'Nhập mới' : 'Hủy chỉnh sửa';
  $('#portalLabel').textContent = admin() ? 'CỔNG QUẢN TRỊ' : staff() ? 'CỔNG QUẢN LÝ BAY' : 'CỔNG NGƯỜI VẬN HÀNH';
  $('#portalBadge').textContent = staff() ? '● Khu vực quản lý và phê duyệt' : '● Khu vực đăng ký bay';
  $('#nav [data-tab="flights"]').textContent = staff() ? '✓ Duyệt kế hoạch bay' : '↗ Kế hoạch bay của tôi';
  $('#nav [data-tab="drones"]').textContent = staff() ? '◎ Quản lý phương tiện' : '◎ Phương tiện của tôi';
  await choices();
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
  const selectedDrone = $('#droneSelect').value;
  const drones = operator() ? await allPages('/drones/owner/' + state.me.id) : [];
  $('#droneSelect').innerHTML = '<option value="">Chọn phương tiện</option>' + drones.map(drone =>
    `<option value="${drone.id}">${escape(drone.serialNumber)} · ${escape(droneTypes[drone.droneType] || 'Chưa khai báo loại')} · ${escape(drone.model)}</option>`).join('');
  $('#droneSelect').value = selectedDrone;
  if (admin()) {
    const selectedRole = $('#roleSelect').value;
    const roles = await allPages('/roles');
    $('#roleSelect').innerHTML = roles.map(role => `<option value="${role.id}">${escape(role.name)} (${escape(role.code)})</option>`).join('');
    if (selectedRole) $('#roleSelect').value = selectedRole;
  }
}

async function tab(name) {
  if ((['users', 'logs'].includes(name) && !staff()) || (name === 'roles' && !admin())) return;
  state.tab = name;
  state.page = 0;
  $('#keyword').value = '';
  $('#activeFilter').value = 'true';
  $('#lockedFilter').value = '';
  $('#lockedFilter').hidden = name !== 'users';
  $('#flightFilter').value = name === 'flights' && staff() ? 'PENDING' : '';
  $('#flightFilter').hidden = name !== 'flights';
  document.querySelectorAll('#nav button').forEach(button => button.classList.toggle('active', button.dataset.tab === name));
  Object.keys(titles).forEach(key => $('#' + key + 'Panel').hidden = key !== name);
  $('#pageTitle').textContent = name === 'flights' ? (staff() ? 'Duyệt và điều hành kế hoạch bay' : 'Kế hoạch bay của tôi') : titles[name];
  $('#pageDescription').textContent = name === 'flights' && staff()
    ? 'Xét duyệt kế hoạch của người vận hành; theo dõi trạng thái khai thác toàn hệ thống.'
    : name === 'drones' && staff() ? 'Tra cứu toàn bộ UAV; chọn Sửa để cập nhật hồ sơ đã khai báo.' : descriptions[name];
  $('#listTitle').textContent = 'Danh sách ' + titles[name].toLowerCase();
  $('#keyword').hidden = !['drones', 'users', 'logs'].includes(name);
  $('#keyword').placeholder = {drones: 'Tìm số sê-ri', users: 'Tên đăng nhập, họ tên hoặc email', logs: 'Mã hành động, ví dụ FLIGHT_SUBMIT'}[name] || '';
  await load();
}

const actionButton = (action, id, label) => `<button type="button" data-action="${action}" data-id="${id}">${label}</button>`;
const formatTime = time => new Date(time).toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
const toUtc = time => new Date(time.length === 16 ? time + ':00+07:00' : time + '+07:00').toISOString();
function prettyJson(json) { try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; } }

function renderRow(row) {
  const id = row.id;
  const active = row.isActive && !row.deletedAt;
  const detail = `<small>${escape(id)}</small>`;
  if (state.tab === 'drones') {
    return `<td>${escape(row.serialNumber)}${detail}</td><td>${escape(row.model)}<small>${escape(droneTypes[row.droneType] || 'Chưa khai báo loại')}</small><small>${escape(row.owner.companyName || row.owner.fullName)}</small></td><td>${row.maxFlightTime} phút · ${row.maxSpeed} m/s</td><td>${active ? actionButton('edit', id, 'Sửa') + actionButton('delete', id, 'Xóa mềm') : actionButton('restore', id, 'Khôi phục')}</td>`;
  }
  if (state.tab === 'flights') {
    const next = {PENDING: ['APPROVED', 'REJECTED'], APPROVED: ['ACTIVE'], ACTIVE: ['COMPLETED']}[row.status] || [];
    const actionLabels = {APPROVED: 'Duyệt', REJECTED: 'Từ chối', ACTIVE: 'Bắt đầu bay', COMPLETED: 'Kết thúc bay'};
    let actions = active && staff() ? next.map(status => actionButton('status:' + status, id, actionLabels[status])).join('') : '';
    if (active && operator() && row.operator.id === state.me.id && ['PENDING', 'APPROVED'].includes(row.status) && new Date(row.startTime) > new Date())
      actions += actionButton('cancel', id, 'Hủy kế hoạch');
    if (!active && staff()) actions += actionButton('restore', id, 'Khôi phục');
    return `<td>${escape(row.drone.serialNumber)}${detail}<small>${escape(row.operator.companyName || row.operator.fullName)}</small></td><td>${escape(formatTime(row.startTime))}<small>Đến ${escape(formatTime(row.endTime))}</small></td><td><span class="badge ${row.status}">${labels[row.status]}</span><details><summary>Quỹ đạo 4D</summary><pre>${escape(prettyJson(row.trajectoryJson))}</pre></details></td><td>${actions}</td>`;
  }
  if (state.tab === 'users') {
    const actions = admin() && active ? actionButton('edit', id, 'Sửa') + (id !== state.me.id ? actionButton(row.isLocked ? 'unlock' : 'lock', id, row.isLocked ? 'Mở khóa' : 'Khóa') + actionButton('delete', id, 'Xóa mềm') : '') : '';
    return `<td>${escape(row.username)}${detail}</td><td>${escape(row.companyName || row.fullName)}<small>${row.accountType === 'BUSINESS' ? 'Doanh nghiệp · ' + escape(row.taxCode) : 'Cá nhân'}</small><small>${escape(row.email)}</small></td><td>${escape(row.role.code)}<small>${row.isLocked ? 'Đang khóa' : 'Không khóa'}</small></td><td>${actions}</td>`;
  }
  if (state.tab === 'roles') {
    const actions = active ? actionButton('edit', id, 'Sửa') + (!row.isSystem ? actionButton('delete', id, 'Xóa mềm') : '') : actionButton('restore', id, 'Khôi phục');
    return `<td>${escape(row.code)}${detail}</td><td>${escape(row.name)}<small>${escape(row.description)}</small></td><td>${row.isSystem ? 'Vai trò hệ thống' : 'Vai trò tùy chỉnh'}</td><td>${actions}</td>`;
  }
  return `<td>${escape(formatTime(row.createdAt))}</td><td>${escape(row.user?.username || 'Hệ thống')}</td><td>${escape(row.actionType)}</td><td>${escape(row.details)}</td>`;
}

async function load() {
  const requestedTab = state.tab;
  const params = new URLSearchParams({page: state.page, size: $('#sizeFilter').value, sort: $('#sortFilter').value, isActive: $('#activeFilter').value});
  let path = '/' + requestedTab;
  const keyword = $('#keyword').value.trim();
  if (keyword && requestedTab === 'drones') { path += '/search'; params.set('serialNumber', keyword); }
  if (keyword && requestedTab === 'users') params.set('keyword', keyword);
  if (requestedTab === 'users' && $('#lockedFilter').value) params.set('isLocked', $('#lockedFilter').value);
  if (requestedTab === 'flights' && $('#flightFilter').value === 'approved') path += '/active-or-approved';
  if (requestedTab === 'flights' && $('#flightFilter').value && $('#flightFilter').value !== 'approved') params.set('status', $('#flightFilter').value);
  if (keyword && requestedTab === 'logs') { path += '/action'; params.set('type', keyword); }
  const result = await api(path + '?' + params);
  if (state.tab !== requestedTab) return;
  state.rows = result.content;
  state.totalPages = result.totalPages;
  const headings = {
    drones: ['Số sê-ri', 'Phương tiện / Chủ sở hữu', 'Thông số', 'Thao tác'],
    flights: ['Phương tiện / Người vận hành', 'Thời gian', 'Trạng thái / Quỹ đạo', 'Thao tác'],
    users: ['Tên đăng nhập', 'Người dùng', 'Vai trò / Trạng thái', 'Thao tác'],
    roles: ['Mã vai trò', 'Thông tin', 'Loại', 'Thao tác'],
    logs: ['Thời gian', 'Người thực hiện', 'Hành động', 'Chi tiết']
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

for (const [name, path] of [['drone', 'drones'], ['user', 'users'], ['role', 'roles']]) $('#' + name + 'Form').addEventListener('submit', event => {
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
    if (name === 'user' && !data.password) delete data.password;
    await api('/' + path + (id ? '/' + id : ''), id ? 'PUT' : 'POST', data);
    form.reset(); form.elements.id.value = '';
    if (name === 'drone' && !operator()) $('#droneFormCard').hidden = true;
    await choices(); await load(); notice('Đã lưu thông tin.');
  }, event.submitter);
});

function addWaypoint() {
  const row = document.createElement('div');
  row.className = 'waypoint';
  row.innerHTML = '<label>Vĩ độ<input data-field="latitude" type="number" min="-90" max="90" step="any" required></label><label>Kinh độ<input data-field="longitude" type="number" min="-180" max="180" step="any" required></label><label>Độ cao (m AMSL)<input data-field="altitude" type="number" min="0" step="any" required></label><label>Thời gian (UTC+7)<input data-field="time" type="datetime-local" required></label><button type="button" aria-label="Xóa waypoint">×</button>';
  row.querySelector('button').onclick = () => {
    if ($('#waypoints').children.length > 2) row.remove(); else notice('Cần ít nhất 2 waypoint.');
  };
  $('#waypoints').append(row);
}
$('#addWaypoint').onclick = addWaypoint;
addWaypoint(); addWaypoint();

$('#flightForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    const data = formData(form);
    const points = Array.from(document.querySelectorAll('.waypoint')).map(row => Object.fromEntries(
      Array.from(row.querySelectorAll('input')).map(input => [input.dataset.field, input.dataset.field === 'time' ? input.value : Number(input.value)])));
    if (data.endTime <= data.startTime) throw new Error('Hạ cánh phải sau cất cánh.');
    if (points.some((point, index) => point.time < data.startTime || point.time > data.endTime || (index > 0 && point.time <= points[index - 1].time)))
      throw new Error('Thời gian waypoint phải tăng và nằm trong khoảng bay.');
    data.startTime = toUtc(data.startTime);
    data.endTime = toUtc(data.endTime);
    points.forEach(point => { point.time = toUtc(point.time); });
    data.trajectoryJson = JSON.stringify(points);
    await api('/flights', 'POST', data);
    form.reset(); await load(); notice('Đã nộp kế hoạch. Trạng thái: chờ duyệt.');
  }, event.submitter);
});

$('#list').addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  run(async () => {
    const row = state.rows.find(item => item.id === button.dataset.id), action = button.dataset.action;
    if (action === 'edit') {
      const form = $('#' + {drones: 'drone', users: 'user', roles: 'role'}[state.tab] + 'Form');
      const values = {...row, roleId: row.role?.id};
      if (state.tab === 'drones') $('#droneFormCard').hidden = false;
      for (const input of form.elements) if (input.name && input.type !== 'password') input.value = values[input.name] ?? '';
      if (form.elements.password) form.elements.password.value = '';
      form.scrollIntoView({behavior: 'smooth'}); return;
    }
    if ((['delete', 'cancel', 'lock'].includes(action) || ['status:APPROVED', 'status:REJECTED'].includes(action)) && !confirm('Xác nhận ' + button.textContent.toLowerCase() + '?')) return;
    const path = '/' + state.tab + '/' + row.id;
    if (action === 'delete') await api(path, 'DELETE');
    else if (action.startsWith('status:')) await api(path + '/status', 'PUT', {status: action.split(':')[1]});
    else await api(path + '/' + action, 'PUT');
    await choices(); await load(); notice('Đã cập nhật.');
  }, button);
});

$('#clearLogs').onclick = () => run(async () => {
  if (confirm('Xóa mềm nhật ký hiện tại?')) { await api('/logs/clear', 'DELETE'); await load(); }
});
$('#refresh').onclick = () => run(async () => { await choices(); await load(); });
$('#search').onclick = () => run(async () => { state.page = 0; await load(); });
$('#keyword').onkeydown = event => { if (event.key === 'Enter') $('#search').click(); };
for (const selector of ['#activeFilter', '#lockedFilter', '#flightFilter', '#sortFilter', '#sizeFilter'])
  $(selector).onchange = () => $('#search').click();
$('#previous').onclick = () => run(async () => { state.page = Math.max(0, state.page - 1); await load(); });
$('#next').onclick = () => run(async () => { if (state.page + 1 < state.totalPages) state.page++; await load(); });

(async () => {
  try { await enter(await api('/auth/me')); }
  catch (error) { showAuth(); if (!error.message.includes('đăng nhập')) notice(error.message); }
})();
