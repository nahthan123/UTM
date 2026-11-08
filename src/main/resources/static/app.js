const state = { account: null, companies: [], flights: [], monitorTimer: null, currentFlight: null };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const droneLabels = { MULTIROTOR: 'Đa cánh quạt', FIXED_WING: 'Cánh bằng', HYBRID: 'Hybrid' };
const statusLabels = { REGISTERED: 'Đã đăng ký', SENT_TO_SIMULATOR: 'Đã gửi', SIMULATING: 'Đang mô phỏng', COMPLETED: 'Hoàn thành' };

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || 'Không thể kết nối hệ thống');
    error.status = response.status;
    if (response.status === 401 && !url.includes('/api/auth/login')) showAuth();
    throw error;
  }
  return body;
}

function setAuthTab(tab) {
  $$('[data-auth-tab]').forEach((button) => button.classList.toggle('active', button.dataset.authTab === tab));
  $$('.auth-form').forEach((form) => form.classList.toggle('active', form.id === `${tab}Form`));
  $('.auth-panel').scrollTop = 0;
}

function showAuth(message) {
  clearInterval(state.monitorTimer);
  state.account = null;
  state.currentFlight = null;
  $('#appShell').hidden = true;
  $('#authRoot').hidden = false;
  setAuthTab('login');
  if (message) toast('Phiên đăng nhập', message, true);
}

async function enterApp(account) {
  state.account = account;
  $('#authRoot').hidden = true;
  $('#appShell').hidden = false;
  const name = account.displayName || account.email;
  const type = account.accountType === 'BUSINESS' ? 'Doanh nghiệp khai thác' : 'Cá nhân khai thác';
  $('#accountName').textContent = name;
  $('#accountType').textContent = type;
  $('#accountAvatar').textContent = initials(name);
  await reload();
  showPage('overview');
}

async function boot() {
  try { await enterApp(await api('/api/auth/me')); }
  catch (error) { if (error.status !== 401) toast('Không thể kết nối', error.message, true); }
}

function showPage(page) {
  $$('.page').forEach((item) => item.classList.toggle('active', item.id === page));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.page === page));
  const label = $(`.nav-item[data-page="${page}"]`)?.textContent.trim() || 'Tổng quan';
  $('#breadcrumb').textContent = label;
  $('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toast(title, detail, error = false) {
  const node = $('#toast');
  node.querySelector('b').textContent = title;
  node.querySelector('small').textContent = detail;
  node.querySelector(':scope > span').textContent = error ? '!' : '✓';
  node.classList.add('show');
  clearTimeout(node.timer);
  node.timer = setTimeout(() => node.classList.remove('show'), 3200);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function initials(value = '') {
  return value.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'SP';
}

function dateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

async function reload() {
  [state.companies, state.flights] = await Promise.all([api('/api/companies'), api('/api/flights')]);
  renderAll();
}

function renderAll() {
  const profile = state.companies[0];
  $('#companyCount').textContent = state.companies.length;
  $('#verifiedCount').textContent = state.companies.filter((item) => item.status === 'VERIFIED').length;
  $('#flightCount').textContent = state.flights.length;
  $('#simCount').textContent = state.flights.filter((item) => item.status === 'SIMULATING').length;
  $('#flightListCount').textContent = state.flights.length;

  $('#companySelect').innerHTML = '<option value="">Chọn hồ sơ đơn vị bay</option>' + state.companies
    .map((item) => `<option value="${item.id}">${escapeHtml(item.companyName)} · ${escapeHtml(item.taxCode)}</option>`).join('');
  if (profile) $('#companySelect').value = profile.id;
  $('#monitorSelect').innerHTML = '<option value="">Chọn chuyến bay</option>' + state.flights
    .map((item) => `<option value="${item.id}">${item.flightCode} · ${escapeHtml(item.missionName)}</option>`).join('');

  renderProfile(profile);
  $('#flightList').innerHTML = state.flights.length ? state.flights.map((item) => `
    <div class="flight-item"><div class="flight-item-head"><b>${item.flightCode} · ${escapeHtml(item.missionName)}</b><span class="status-pill ${item.status.toLowerCase()}">${statusLabels[item.status]}</span></div>
    <div class="route"><span>${escapeHtml(item.departureLocation)}</span><i></i><span>${escapeHtml(item.destinationLocation)}</span></div>
    <div class="flight-item-actions"><small>${droneLabels[item.droneType]} · ${dateTime(item.scheduledAt)}</small>${item.status === 'REGISTERED' ? `<button class="send-mini" data-send="${item.id}">Gửi mô phỏng →</button>` : ''}</div></div>`).join('') : empty('Chưa có chuyến bay nào.');

  const recent = state.flights.slice(0, 3);
  $('#recentFlights').innerHTML = recent.length ? recent.map((item) => `
    <div class="recent-item"><span class="mini-icon">↗</span><div><b>${item.flightCode} · ${escapeHtml(item.missionName)}</b><small>${droneLabels[item.droneType]} · ${dateTime(item.scheduledAt)}</small></div><span class="status-pill ${item.status.toLowerCase()}">${statusLabels[item.status]}</span></div>`).join('') : empty('Hoạt động mới sẽ xuất hiện tại đây.');
}

function renderProfile(profile) {
  if (!profile || !state.account) return;
  const isBusiness = state.account.accountType === 'BUSINESS';
  $('#profileAvatar').textContent = initials(profile.companyName);
  $('#profileName').textContent = profile.companyName;
  $('#profileEmail').textContent = profile.email;
  $('#profileTypeLabel').textContent = isBusiness ? 'DOANH NGHIỆP KHAI THÁC' : 'CÁ NHÂN KHAI THÁC';
  $('#profileTaxCode').textContent = profile.taxCode;
  $('#profileRepresentative').textContent = profile.representative;
  $('#profilePhone').textContent = profile.phone;
  $('#profileLicense').textContent = profile.licenseNumber || 'Chưa cập nhật';
  $('#profileAddress').textContent = profile.address;
}

function empty(message) { return `<div class="empty">${message}</div>`; }

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.currentTarget.querySelector('[type="submit"]');
  const data = Object.fromEntries(new FormData(event.currentTarget));
  delete data.remember;
  submit.disabled = true;
  submit.textContent = 'Đang đăng nhập...';
  try {
    const account = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
    await enterApp(account);
    toast('Đăng nhập thành công', `Xin chào ${account.displayName}.`);
  } catch (error) { toast('Không thể đăng nhập', error.message, true); }
  finally { submit.disabled = false; submit.innerHTML = 'Đăng nhập <span>→</span>'; }
});

$('#registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = event.currentTarget.querySelector('[type="submit"]');
  const data = Object.fromEntries(new FormData(event.currentTarget));
  if (data.password !== data.confirmPassword) return toast('Mật khẩu chưa khớp', 'Vui lòng nhập lại mật khẩu xác nhận.', true);
  delete data.confirmPassword;
  delete data.terms;
  submit.disabled = true;
  submit.textContent = 'Đang tạo tài khoản...';
  try {
    const account = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
    event.currentTarget.reset();
    updateAccountType('INDIVIDUAL');
    await enterApp(account);
    toast('Đăng ký thành công', 'Hồ sơ đơn vị bay đã được khởi tạo.');
  } catch (error) { toast('Không thể đăng ký', error.message, true); }
  finally { submit.disabled = false; submit.innerHTML = 'Tạo tài khoản <span>→</span>'; }
});

function updateAccountType(type) {
  const individual = type === 'INDIVIDUAL';
  $('#individualFields').hidden = !individual;
  $('#businessFields').hidden = individual;
  $$('#individualFields input').forEach((input) => { input.disabled = !individual; input.required = individual; });
  $$('#businessFields input').forEach((input) => {
    input.disabled = individual;
    input.required = !individual && ['companyName', 'taxCode', 'representative'].includes(input.name);
  });
}

$('#flightForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const data = Object.fromEntries(form);
  data.companyId = Number(data.companyId);
  data.altitude = Number(data.altitude);
  data.estimatedDuration = Number(data.estimatedDuration);
  try {
    const flight = await api('/api/flights', { method: 'POST', body: JSON.stringify(data) });
    await reload();
    $('#monitorSelect').value = flight.id;
    selectMonitorFlight(flight.id);
    toast('Đã đăng ký chuyến bay', `${flight.flightCode} đã sẵn sàng gửi mô phỏng.`);
    showPage('monitor');
  } catch (error) { toast('Không thể đăng ký', error.message, true); }
});

async function sendFlight(id) {
  try {
    const flight = await api(`/api/flights/${id}/send`, { method: 'POST' });
    await reload();
    $('#monitorSelect').value = flight.id;
    selectMonitorFlight(flight.id);
    showPage('monitor');
    toast('Đã gửi lệnh bay', `${flight.flightCode} đang được mô phỏng.`);
  } catch (error) { toast('Không thể gửi lệnh', error.message, true); }
}

function selectMonitorFlight(id) {
  state.currentFlight = state.flights.find((item) => item.id === Number(id));
  clearInterval(state.monitorTimer);
  if (!state.currentFlight) {
    $('#monitorMeta').textContent = 'Chọn một chuyến bay để bắt đầu';
    $('#sendFlightButton').disabled = true;
    resetMetrics();
    return;
  }
  const flight = state.currentFlight;
  $('#monitorMeta').textContent = `${flight.departureLocation} → ${flight.destinationLocation} · ${droneLabels[flight.droneType]}`;
  $('#sendFlightButton').disabled = flight.status !== 'REGISTERED';
  $('#sendFlightButton').textContent = flight.status === 'REGISTERED' ? 'Gửi lệnh bay ↗' : 'Lệnh bay đã gửi ✓';
  if (flight.status === 'SIMULATING') {
    updateMonitoring();
    state.monitorTimer = setInterval(updateMonitoring, 2000);
  } else resetMetrics();
}

async function updateMonitoring() {
  if (!state.currentFlight) return;
  try {
    const data = await api(`/api/flights/${state.currentFlight.id}/monitoring`);
    $('#metricAltitude').innerHTML = `${data.altitude} <i>m</i>`;
    $('#metricSpeed').innerHTML = `${data.speed} <i>km/h</i>`;
    $('#metricBattery').innerHTML = `${data.battery} <i>%</i>`;
    $('#metricSignal').innerHTML = `${data.signal} <i>%</i>`;
    $('#batteryMeter').style.width = `${data.battery}%`;
    $('#progressText').textContent = `${data.progress}%`;
    $('#progressBar').style.width = `${data.progress}%`;
    $('#movingDrone').style.left = `${Math.min(90, data.progress)}%`;
    $('#movingDrone').style.top = `${-16 + Math.sin(data.progress / 12) * 16}px`;
    $('#monitorMessage').textContent = `Đang nhận telemetry từ ${data.flightCode}. Cập nhật lúc ${new Date(data.updatedAt).toLocaleTimeString('vi-VN')}.`;
  } catch (error) { clearInterval(state.monitorTimer); if (error.status !== 401) toast('Mất kết nối giám sát', error.message, true); }
}

function resetMetrics() {
  $('#metricAltitude').innerHTML = '0 <i>m</i>';
  $('#metricSpeed').innerHTML = '0 <i>km/h</i>';
  $('#metricBattery').innerHTML = '100 <i>%</i>';
  $('#metricSignal').innerHTML = '100 <i>%</i>';
  $('#batteryMeter').style.width = '100%';
  $('#progressText').textContent = '0%';
  $('#progressBar').style.width = '0%';
  $('#movingDrone').style.left = '0%';
  $('#monitorMessage').textContent = 'Đang chờ gửi lệnh bay đến hệ thống mô phỏng.';
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button, a');
  if (!button) return;
  if (button.dataset.authTab) { event.preventDefault(); setAuthTab(button.dataset.authTab); }
  if (button.dataset.page) { event.preventDefault(); showPage(button.dataset.page); }
  if (button.dataset.send) sendFlight(button.dataset.send);
});

$$('input[name="accountType"]').forEach((input) => input.addEventListener('change', () => updateAccountType(input.value)));
$('.password-toggle').addEventListener('click', (event) => {
  const input = event.currentTarget.parentElement.querySelector('input');
  input.type = input.type === 'password' ? 'text' : 'password';
});
$('#forgotPassword').addEventListener('click', () => toast('Khôi phục mật khẩu', 'Tính năng gửi email khôi phục sẽ được bổ sung ở phiên bản tiếp theo.'));
$('#logoutButton').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); }
  catch (error) { if (error.status !== 401) toast('Không thể đăng xuất', error.message, true); }
  showAuth();
});
$('#menuButton').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#monitorSelect').addEventListener('change', (event) => selectMonitorFlight(event.target.value));
$('#sendFlightButton').addEventListener('click', () => state.currentFlight && sendFlight(state.currentFlight.id));

const departure = $('#flightForm [name="departureLocation"]');
const destination = $('#flightForm [name="destinationLocation"]');
departure.addEventListener('input', () => $('#routeStart').textContent = departure.value || 'Chưa chọn');
destination.addEventListener('input', () => $('#routeEnd').textContent = destination.value || 'Chưa chọn');
const soon = new Date(Date.now() + 60 * 60 * 1000);
soon.setMinutes(Math.ceil(soon.getMinutes() / 5) * 5, 0, 0);
$('#scheduledAt').value = new Date(soon.getTime() - soon.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
updateAccountType('INDIVIDUAL');
boot();
