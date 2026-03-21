// login.js - Antigravity Login Logic & Enhanced Weather

const googleBtn = document.getElementById('google-btn');
const errorMsg = document.getElementById('error-msg');

// 1. Google Login Simulation
googleBtn.addEventListener('click', () => {
    const originalText = googleBtn.innerHTML;
    googleBtn.innerHTML = '<span class="ph ph-spinner ph-spin" style="font-size:1.5rem; color:#3c4043;"></span>';
    setTimeout(() => {
        localStorage.setItem('ag_auth', 'true');
        window.location.href = 'index.html';
    }, 1200);
});

if (localStorage.getItem('ag_auth') === 'true') {
    window.location.href = 'index.html';
}

// 2. Enhanced Weather API (7-Day Forecast + Hourly)
let globalWeatherData = null;

async function fetchWeather() {
    try {
        const lat = 37.5665, lon = 126.9780; // 서울
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul`;
        const response = await fetch(url);
        const data = await response.json();
        globalWeatherData = data;
        
        renderCurrentWeather(data.current_weather);
        renderWeeklyWeather(data.daily, data.hourly);
    } catch (err) {
        console.error('Weather Fetch Error:', err);
    }
}

function getWeatherIcon(code) {
    if (code <= 1) return 'ph-sun-dim';
    if (code <= 3) return 'ph-cloud-sun';
    if (code <= 48) return 'ph-cloud';
    if (code <= 67) return 'ph-cloud-rain';
    if (code <= 77) return 'ph-cloud-snow';
    if (code <= 82) return 'ph-cloud-lightning';
    return 'ph-cloud-sun';
}

function renderCurrentWeather(current) {
    const tempEl = document.querySelector('.curr-temp');
    if (tempEl && current && typeof current.temperature !== 'undefined') {
        tempEl.innerText = `${Math.round(current.temperature)}°C`;
    } else if (tempEl) {
        tempEl.innerText = '--°C';
    }
}

function renderWeeklyWeather(daily, hourly) {
    const weekContainer = document.getElementById('weather-week');
    if (!weekContainer) return;
    weekContainer.innerHTML = '';

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayLabel = days[date.getDay()];
        
        // AM/PM Logic: Use 9:00 for AM, 15:00 for PM
        const amIdx = i * 24 + 9;
        const pmIdx = i * 24 + 15;
        const amCode = hourly.weathercode[amIdx];
        const pmCode = hourly.weathercode[pmIdx];

        const dayCol = document.createElement('div');
        dayCol.className = 'day-col';
        dayCol.onclick = () => showHourlyDetail(i);
        
        dayCol.innerHTML = `
            <div class="day-label">${dayLabel}</div>
            <div class="am-pm">
                <div class="am">
                    <span class="am-label">오전</span>
                    <i class="ph ${getWeatherIcon(amCode)} day-icon"></i>
                </div>
                <div class="pm">
                    <span class="pm-label">오후</span>
                    <i class="ph ${getWeatherIcon(pmCode)} day-icon"></i>
                </div>
            </div>
        `;
        weekContainer.appendChild(dayCol);
    }
}

function showHourlyDetail(dayIndex) {
    if (!globalWeatherData) return;
    
    const popup = document.getElementById('hourly-popup');
    const popupDate = document.getElementById('popup-date');
    const hourlyList = document.getElementById('hourly-list');
    
    const dateStr = globalWeatherData.daily.time[dayIndex];
    const date = new Date(dateStr);
    popupDate.innerText = `${date.getMonth() + 1}월 ${date.getDate()}일 시간별 날씨`;
    
    hourlyList.innerHTML = '';
    
    const startIdx = dayIndex * 24;
    for (let h = 0; h < 24; h++) {
        const idx = startIdx + h;
        const time = `${h.toString().padStart(2, '0')}:00`;
        const temp = Math.round(globalWeatherData.hourly.temperature_2m[idx]);
        const code = globalWeatherData.hourly.weathercode[idx];
        
        const item = document.createElement('div');
        item.className = 'h-item';
        item.innerHTML = `
            <div class="h-time">${time}</div>
            <i class="ph ${getWeatherIcon(code)}" style="font-size: 1.5rem;"></i>
            <div class="h-temp">${temp}°C</div>
        `;
        hourlyList.appendChild(item);
    }
    
    popup.classList.add('active');
}

document.getElementById('close-popup').onclick = () => {
    document.getElementById('hourly-popup').classList.remove('active');
};

fetchWeather();

// 3. Antigravity Particle Background
const canvasContainer = document.getElementById('canvas-container');
const canvas = document.createElement('canvas');
canvas.id = 'bg-canvas';
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvasContainer.appendChild(canvas);

const ctx = canvas.getContext('2d');
let width, height;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const particles = [];
const colors = ['#e63946', '#4facfe', '#a18cd1', '#3b82f6', '#ea4335', '#8b5cf6'];
for (let i = 0; i < 900; i++) {
    particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * (Math.max(width, height) / 1.2),
        speed: (Math.random() * 0.0015) + 0.0005,
        outwardSpeed: (Math.random() * 0.4) + 0.1,
        size: Math.random() * 1.5 + 0.8,
        length: Math.random() * 4 + 4,
        color: colors[Math.floor(Math.random() * colors.length)]
    });
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    particles.forEach(p => {
        p.angle -= p.speed; 
        p.radius += p.outwardSpeed;
        if (p.radius > Math.max(width, height)) p.radius = Math.random() * 50; 
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius;
        let opacity = 1;
        if (p.radius < 100) opacity = p.radius / 100;
        ctx.save();
        ctx.globalAlpha = opacity * 0.7;
        ctx.translate(x, y);
        ctx.rotate(p.angle + Math.PI / 3); 
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-p.size/2, -p.length/2, p.size, p.length, 2);
        else ctx.rect(-p.size/2, -p.length/2, p.size, p.length);
        ctx.fill();
        ctx.restore();
    });
    requestAnimationFrame(animate);
}
animate();
