// app.js - Antigravity Sales Ledger (React Integration)
const { useState, useEffect, useMemo, useRef } = React;
const h = React.createElement;

// Constants
const KEY = 'antigravity_ledger_v2';
const N = n => (+n || 0).toLocaleString('ko-KR');
const TODAY = new Date().toISOString().split('T')[0];

/* Enter 키를 누르면 다음 필드로 포커스 이동 */
const handleEnter = (e) => {
    if (e.key === 'Enter') {
        const container = e.target.closest('form') || e.target.closest('.mbody') || e.target.closest('.pp-add-grid');
        if (!container) return;
        const inputs = Array.from(container.querySelectorAll('input:not([readonly]), select, .btn-submit, .pp-add-btn'));
        const idx = inputs.indexOf(e.target);
        if (idx > -1 && idx < inputs.length - 1) {
            e.preventDefault();
            inputs[idx + 1].focus();
        } else if (idx === inputs.length - 1) {
            // 마지막 필드에서 Enter 누르면 클릭 이벤트 발생 (저장 버튼 등)
            // e.target.click(); 
        }
    }
};

function showToast(m) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = m;
    t.classList.add('on');
    setTimeout(() => t.classList.remove('on'), 2200);
}

// ── COMPONENTS ──

/* 분할 수금 패널 (리스트 인라인) */
function PayPanel({ row, onSave, onClose }) {
    const [pays, setPays] = useState(row.payments || []);
    const [newDate, setNewDate] = useState(TODAY);
    const [newAmt, setNewAmt] = useState('');
    const [newNote, setNewNote] = useState('');

    const addPay = () => {
        if (!newAmt) return;
        const updated = [...pays, { id: Date.now() + '', date: newDate, amt: +newAmt, note: newNote }];
        setPays(updated);
        onSave({ ...row, payments: updated });
        setNewAmt(''); setNewNote('');
    };

    const delPay = (id) => {
        const updated = pays.filter(p => p.id !== id);
        setPays(updated);
        onSave({ ...row, payments: updated });
    };

    const total = (+row.amount || 0) + (+row.vat || 0);
    const paidTotal = pays.reduce((s, p) => s + p.amt, 0);

    let runningTotal = 0;

    return h('div', { className: 'pay-panel glass' },
        h('div', { className: 'pay-panel-hdr' },
            h('div', { className: 'pp-title' }, 
                h('span', null, '💰 수금 관리 — '), h('b', null, row.trader), ' / ', h('span', null, row.item)
            ),
            h('div', { className: 'pp-summary' },
                h('span', null, '합계금액 ', h('b', null, N(total), '원')),
                h('span', null, '수금완료 ', h('b', { className: 'g' }, N(paidTotal), '원')),
                h('span', null, '잔액 ', h('b', { className: 'r' }, N(total - paidTotal), '원'))
            )
        ),
        h('table', { className: 'pay-tbl' },
            h('thead', null, h('tr', null, h('th', null, '차수'), h('th', null, '수금일'), h('th', null, '수금금액'), h('th', null, '메모'), h('th', null, '누계'), h('th', null, ''))),
            h('tbody', null,
                pays.map((p, idx) => {
                    runningTotal += p.amt;
                    return h('tr', { key: p.id },
                        h('td', { style: { color: 'var(--primary)', fontWeight: 700 } }, `${idx + 1}차`),
                        h('td', null, p.date),
                        h('td', { className: 'pn bold' }, N(p.amt), '원'),
                        h('td', null, p.note || '-'),
                        h('td', { className: 'pn', style: { color: 'var(--secondary)' } }, N(runningTotal), '원'),
                        h('td', null, h('button', { className: 'pp-del-btn', onClick: () => delPay(p.id) }, '×'))
                    );
                })
            )
        ),
        /* 신규 수금 입력창 */
        h('div', { className: 'pp-add-box' },
            h('div', { className: 'pp-add-grid' },
                h('input', { type: 'date', className: 'pp-in', value: newDate, onChange: e => setNewDate(e.target.value), onKeyDown: handleEnter }),
                h('input', { type: 'number', className: 'pp-in', placeholder: '수금금액', value: newAmt, onChange: e => setNewAmt(e.target.value), onKeyDown: handleEnter }),
                h('input', { type: 'text', className: 'pp-in', placeholder: '메모 (선택)', value: newNote, onChange: e => setNewNote(e.target.value), onKeyDown: handleEnter }),
                h('button', { className: 'pp-add-btn', onClick: addPay }, h('i', { className: 'ph ph-plus' }), ' 수금')
            )
        )
    );
}

/* 매출 등록/수정 모달 */
function Modal({ init, onSave, onClose, traders }) {
    const isEdit = !!init?.id;
    const [date, setDate] = useState(init?.date || TODAY);
    const [trader, setTrader] = useState(init?.trader || '');
    const [item, setItem] = useState(init?.item || '');
    const [amount, setAmount] = useState(init?.amount || '');
    const [vat, setVat] = useState(init?.vat || '');
    const [prevBal, setPrevBal] = useState(init?.prevBal || '');
    const [note, setNote] = useState(init?.note || '');
    const [pays, setPays] = useState(init?.payments || (isEdit ? [] : [{ id: 'p1', date: TODAY, amt: '', note: '초기수금' }]));

    const handleAmountChange = (v) => {
        setAmount(v);
        setVat(Math.floor(v * 0.1));
    };

    const addPayRow = () => setPays([...pays, { id: Date.now() + '', date: TODAY, amt: '', note: '' }]);
    const updatePay = (id, k, v) => setPays(pays.map(p => p.id === id ? { ...p, [k]: v } : p));
    const delPayRow = (id) => setPays(pays.filter(p => p.id !== id));

    const total = (+amount || 0) + (+vat || 0);
    const totalPaid = pays.reduce((s, p) => s + (+p.amt || 0), 0);

    const submit = (e) => {
        if(e) e.preventDefault();
        onSave({
            id: init?.id || Date.now() + '',
            date, trader, item, amount: +amount, vat: +vat, prevBal: +prevBal, note,
            payments: pays.filter(p => p.amt !== '').map(p => ({ ...p, amt: +p.amt }))
        });
    };

    const FLat = (num, label) => h('label', { className: 'fl' }, h('span', { className: 'fn' }, num), label);

    return h('div', { className: 'modal active', onClick: e => e.target === e.currentTarget && onClose() },
        h('div', { className: 'modal-content glass', style: { maxWidth: 640 } },
            h('div', { className: 'modal-header', style: { border: 'none', paddingBottom: 10 } },
                h('div', null,
                    h('h3', { style: { fontSize: '1.4rem' } }, isEdit ? '거래 수정' : '신규 거래 등록'),
                    isEdit && h('div', { style: { fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 4 } }, `ID: ${init.id}`)
                ),
                h('button', { className: 'close-modal', style: { width: 34, height: 34, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', color: 'var(--text-dim)' }, onClick: onClose }, '×')
            ),
            h('div', { className: 'mbody', style: { padding: '10px 0' } },
                h('div', { className: 'form-row' },
                    h('div', { className: 'form-group' }, FLat(1, '날짜'), h('input', { type: 'date', value: date, onChange: e => setDate(e.target.value), onKeyDown: handleEnter })),
                    h('div', { className: 'form-group' }, FLat(2, '거래처'), h('input', { type: 'text', value: trader, onChange: e => setTrader(e.target.value), list: 't-list', onKeyDown: handleEnter }))
                ),
                h('div', { className: 'form-group', style: { marginTop: 15 } }, 
                    FLat(3, '품목/내용'), h('input', { type: 'text', style: { width: '100%' }, value: item, onChange: e => setItem(e.target.value), onKeyDown: handleEnter })
                ),
                h('div', { className: 'form-row', style: { marginTop: 15 } },
                    h('div', { className: 'form-group' }, FLat(4, '매출금액'), h('input', { type: 'number', value: amount, onChange: e => handleAmountChange(e.target.value), onKeyDown: handleEnter })),
                    h('div', { className: 'form-group' }, FLat(5, '부가세 (자동)'), h('input', { type: 'number', value: vat, readOnly: true }))
                ),
                h('div', { className: 'form-row', style: { marginTop: 15 } },
                    h('div', { className: 'form-group' }, FLat(6, '이월잔액'), h('input', { type: 'number', value: prevBal, onChange: e => setPrevBal(e.target.value), onKeyDown: handleEnter })),
                    h('div', { className: 'form-group' }, FLat(7, '비고'), h('input', { type: 'text', value: note, onChange: e => setNote(e.target.value), onKeyDown: handleEnter }))
                ),

                /* 수금 내역 */
                h('div', { className: 'pay-sec', style: { marginTop: 25, background: 'rgba(124, 58, 237, 0.03)' } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 } },
                        h('label', { style: { fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' } }, '💰 수금 내역 관리 (분할)'),
                        h('button', { type: 'button', className: 'btn-sm', style: { background: 'var(--primary)', color: '#fff', border: 'none' }, onClick: addPayRow }, '+ 추가')
                    ),
                    pays.map(p => h('div', { key: p.id, style: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 5, marginBottom: 5 } },
                        h('input', { className: 'fi-sm', type: 'date', value: p.date, onChange: e => updatePay(p.id, 'date', e.target.value), onKeyDown: handleEnter }),
                        h('input', { className: 'fi-sm', type: 'number', placeholder: '금액', value: p.amt, onChange: e => updatePay(p.id, 'amt', e.target.value), onKeyDown: handleEnter }),
                        h('input', { className: 'fi-sm', placeholder: '메모', value: p.note, onChange: e => updatePay(p.id, 'note', e.target.value), onKeyDown: handleEnter }),
                        h('button', { type: 'button', style: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }, onClick: () => delPayRow(p.id) }, '×')
                    )),
                    h('div', { style: { marginTop: 10, fontSize: '0.8rem', textAlign: 'right', color: 'var(--text-dim)' } }, 
                        `현재 수금 합계: `, h('b', { style: { color: 'var(--success)' } }, N(totalPaid), '원')
                    )
                )
            ),
            h('div', { className: 'mftr', style: { border: 'none', padding: '20px 0 0', display: 'flex', gap: 10, justifyContent: 'flex-end' } },
                h('button', { className: 'nav-item', style: { background: '#fff', color: '#000', border: '1px solid #ddd', padding: '10px 25px' }, onClick: onClose }, '취소'),
                h('button', { className: 'btn-submit', style: { margin: 0, width: 'auto', padding: '10px 30px', background: '#0f172a' }, onClick: submit }, isEdit ? '수정 저장' : '등록 하기')
            )
        )
    );
}

/* Chart Component */
function SalesChart({ rows }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || typeof Chart === 'undefined') return;
        const ctx = canvasRef.current.getContext('2d');
        const labels = [...new Set(rows.map(r => r.date.slice(5, 7) + '월'))].sort();
        const data = labels.map(l => {
            return rows.filter(r => r.date.slice(5, 7) + '월' === l)
                       .reduce((s, r) => s + (+r.amount || 0), 0);
        });

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '월별 매출액',
                    data,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: '#3b82f6',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                    x: { grid: { display: false }, border: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
        return () => chart.destroy();
    }, [rows]);

    return h('div', { className: 'chart-container glass', style: { height: 300, padding: 20, marginBottom: 20 } },
        h('h3', { style: { marginBottom: 15, fontSize: '1rem' } }, '📊 월별 매출 추이'),
        h('canvas', { ref: canvasRef })
    );
}

// ── MAIN APP ──
function App() {
    const [rows, setRows] = useState([]);
    const [view, setView] = useState('dashboard');
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [payIdx, setPayIdx] = useState(null); // 인라인 수금 패널 인덱스
    const [syncKey, setSyncKey] = useState(localStorage.getItem('ag_sync_key') || '');

    // Cloud Sync Logic (JSONBin.io)
    const syncData = async (mode) => {
        if (!syncKey) return showToast('연동 코드를 입력해주세요.');
        console.log(`Syncing (${mode})... Bin ID: ${syncKey}`);
        
        const MASTER_KEY = '$2a$10$Yn.2Wd1ozhBFFCGjQpl0bOOz1.AsTeRvSH0.W/UANwsD.vIPdP5t2'; 
        if (MASTER_KEY.includes('placeholder')) return showToast('API 키를 먼저 설정해야 합니다.');
        
        showToast(mode === 'up' ? '클라우드에 저장 중...' : '클라우드에서 불러오는 중...');
        try {
            if (mode === 'up') {
                const res = await fetch(`https://api.jsonbin.io/v3/b/${syncKey}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                    body: JSON.stringify(rows)
                });
                console.log('Upload response:', res.status);
                if (res.ok) {
                    localStorage.setItem('ag_sync_key', syncKey);
                    showToast('✅ 클라우드 저장 완료!');
                } else {
                    const err = await res.json();
                    console.error('Upload Error:', err);
                    showToast(`올리기 실패: ${err.message || '서버 응답 없음'}`);
                }
            } else {
                const res = await fetch(`https://api.jsonbin.io/v3/b/${syncKey}/latest`, {
                    headers: { 'X-Master-Key': MASTER_KEY }
                });
                console.log('Download response:', res.status);
                const data = await res.json();
                if (data.record && Array.isArray(data.record)) {
                    setRows(data.record);
                    localStorage.setItem('antigravity_ledger', JSON.stringify(data.record));
                    showToast('✅ 데이터 동기화 완료!');
                } else {
                    console.error('Download Error:', data);
                    showToast(`받기 실패: 연동 코드를 확인하세요.`);
                }
            }
        } catch (e) {
            console.error('Network/Sync Error:', e);
            showToast('연동 실패: 인터넷 연결이나 서버를 확인하세요.');
        }
    };

    // Data Load & Migration
    useEffect(() => {
        const v2 = localStorage.getItem(KEY);
        if (v2) {
            setRows(JSON.parse(v2));
        } else {
            // Old data migration
            const old1 = localStorage.getItem('antigravity_ledger');
            const old2 = localStorage.getItem('ledger:v4');
            let merged = [];
            if (old1) merged = JSON.parse(old1).map(r => ({ ...r, id: r.id || (Math.random() + Date.now()), payments: r.paid ? [{ id: 'p1', date: r.date, amt: +r.paid, note: '이전데이터' }] : [] }));
            if (old2) merged = [...merged, ...JSON.parse(old2)];
            setRows(merged);
        }
    }, []);

    useEffect(() => {
        if (rows.length > 0) localStorage.setItem(KEY, JSON.stringify(rows));
    }, [rows]);

    const stats = useMemo(() => {
        let t = 0, c = 0, b = 0;
        rows.forEach(r => {
            const total = (+r.amount || 0) + (+r.vat || 0);
            const paid = (r.payments || []).reduce((s, p) => s + p.amt, 0);
            t += total;
            c += paid;
            b += (total - paid);
        });
        return { t, c, b, rate: t ? Math.round(c / t * 100) : 0 };
    }, [rows]);

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return rows.filter(r => r.trader.toLowerCase().includes(s) || r.item.toLowerCase().includes(s));
    }, [rows, search]);

    const traders = useMemo(() => [...new Set(rows.map(r => r.trader))], [rows]);

    const saveRow = (data) => {
        if (rows.find(r => r.id === data.id)) {
            setRows(rows.map(r => r.id === data.id ? data : r));
            showToast('수정되었습니다');
        } else {
            setRows([...rows, data]);
            showToast('저장되었습니다');
        }
        setModal(null);
    };

    const deleteRows = () => {
        if (!confirm(`${selected.size}건의 데이터를 삭제하시겠습니까?`)) return;
        setRows(rows.filter(r => !selected.has(r.id)));
        setSelected(new Set());
        showToast('삭제 완료');
    };

    const toggleRow = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) setSelected(new Set());
        else setSelected(new Set(filtered.map(r => r.id)));
    };

    return h('div', { id: 'app' },
        /* Sidebar */
        h('aside', { className: 'sidebar' },
            h('div', { className: 'logo' }, h('i', { className: 'ph ph-notebook ph-fill' }), h('span', { style: { fontSize: '1.1rem' } }, 'The PLAN')),
            h('nav', null,
                h('button', { className: `nav-item ${view === 'dashboard' ? 'active' : ''}`, onClick: () => setView('dashboard') }, h('i', { className: 'ph ph-circles-four' }), '대시보드'),
                h('button', { className: `nav-item ${view === 'ledger' ? 'active' : ''}`, onClick: () => setView('ledger') }, h('i', { className: 'ph ph-list-bullets' }), '매출 내역'),
                h('button', { className: `nav-item ${view === 'traders' ? 'active' : ''}`, onClick: () => setView('traders') }, h('i', { className: 'ph ph-users' }), '거래처 관리'),
                h('button', { className: `nav-item ${view === 'settings' ? 'active' : ''}`, onClick: () => setView('settings') }, h('i', { className: 'ph ph-gear' }), '설정')
            ),
            h('div', { className: 'sidebar-footer' },
                h('button', { id: 'btn-logout', style: { width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--accent)', color: 'var(--accent)', background: 'none', cursor: 'pointer' }, onClick: () => { if (confirm('로그아웃?')) { localStorage.removeItem('ag_auth'); location.href = 'login.html'; } } }, h('i', { className: 'ph ph-sign-out' }), ' 로그아웃')
            )
        ),

        /* Main */
        h('main', { className: 'main-content' },
            h('header', { className: 'top-header', style: { display: 'flex', gap: 15, alignItems: 'center' } },
                h('div', { className: 'search-bar', style: { flex: 1 } }, h('i', { className: 'ph ph-magnifying-glass' }), h('input', { placeholder: '검색어 입력...', value: search, onChange: e => setSearch(e.target.value) })),
                h('select', { 
                    style: { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: '#fff', padding: '10px 15px', borderRadius: 12, outline: 'none', cursor: 'pointer' },
                    onChange: e => setSearch(e.target.value === 'all' ? '' : e.target.value)
                },
                    h('option', { value: 'all' }, '전체 거래처'),
                    traders.map(t => h('option', { key: t, value: t }, t))
                ),
                h('div', { className: 'user-profile' },
                    h('button', { className: 'btn-add-sales', style: { background: '#f59e0b' }, onClick: () => setModal({}) }, h('i', { className: 'ph ph-plus' }), ' 새 거래')
                )
            ),

            /* Bulk Bar */
            selected.size > 0 && h('div', { style: { background: 'var(--primary)', color: '#fff', padding: '10px 20px', borderRadius: 12, marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slideUp 0.3s' } },
                h('span', { style: { fontWeight: 700 } }, `${selected.size}건 선택됨`),
                h('div', { style: { display: 'flex', gap: 10 } },
                    h('button', { className: 'btn-sm', style: { background: 'var(--accent)', color: '#fff', border: 'none' }, onClick: deleteRows }, '일괄 삭제'),
                    h('button', { className: 'btn-sm', style: { background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }, onClick: () => setSelected(new Set()) }, '취소')
                )
            ),


            view === 'dashboard' && h('div', null,
                h('div', { className: 'stats-grid' },
                    h('div', { className: 'stat-card' }, h('div', { className: 'stat-info' }, h('h3', null, '총 매출액'), h('div', { className: 'value' }, N(stats.t))), h('div', { className: 'stat-icon primary' }, h('i', { className: 'ph ph-chart-line-up' }))),
                    h('div', { className: 'stat-card' }, h('div', { className: 'stat-info' }, h('h3', null, '총 수금액'), h('div', { className: 'value', style: { color: 'var(--success)' } }, N(stats.c))), h('div', { className: 'stat-icon success' }, h('i', { className: 'ph ph-hand-coins' }))),
                    h('div', { className: 'stat-card' }, h('div', { className: 'stat-info' }, h('h3', null, '미수금 총액'), h('div', { className: 'value', style: { color: 'var(--accent)' } }, N(stats.b))), h('div', { className: 'stat-icon accent' }, h('i', { className: 'ph ph-warning-circle' }))),
                    h('div', { className: 'stat-card' }, h('div', { className: 'stat-info' }, h('h3', null, '수금율'), h('div', { className: 'value', style: { color: 'var(--secondary)' } }, stats.rate + '%')), h('div', { className: 'stat-icon secondary' }, h('i', { className: 'ph ph-files' })))
                ),
                h(SalesChart, { rows }),
                h('div', { className: 'ledger-container glass' },
                    h('h2', { style: { marginBottom: 15 } }, '최근 내역'),
                    h('table', { className: 'ledger-table' },
                        h('thead', null, h('tr', null, h('th', null, '날짜'), h('th', null, '거래처'), h('th', null, '품목'), h('th', null, '총액'))),
                        h('tbody', null, rows.slice(-5).reverse().map(r => h('tr', { key: r.id },
                            h('td', null, r.date), h('td', { className: 'bold' }, r.trader), h('td', null, r.item), h('td', null, N((+r.amount || 0) + (+r.vat || 0)))
                        )))
                    )
                )
            ),

            view === 'ledger' && h('div', { className: 'ledger-container glass' },
                h('div', { className: 'list-header' }, h('h2', null, '매출 내역 관리'), h('span', { className: 'count-badge' }, `${filtered.length}건`)),
                h('table', { className: 'ledger-table' },
                    h('thead', null, h('tr', null,
                        h('th', { style: { width: 40 } }, h('input', { type: 'checkbox', checked: selected.size > 0 && selected.size === filtered.length, onChange: toggleAll })),
                        h('th', null, '날짜'), h('th', null, '거래처'), h('th', null, '품목/내용'), 
                        h('th', null, '매출금액'), h('th', null, '부가세'), h('th', null, '합계금액'), 
                        h('th', null, '수금합계'), h('th', null, '누적잔액'), h('th', null, '상태'), h('th', null, '관리')
                    )),
                    h('tbody', null, filtered.map((r, i) => {
                        const sales = +r.amount || 0;
                        const vat = +r.vat || 0;
                        const total = sales + vat;
                        const paid = (r.payments || []).reduce((s, p) => s + p.amt, 0);
                        const remain = total - paid;
                        const isPayOpen = payIdx === i;
                        const status = remain <= 0 ? 'ok' : (paid > 0 ? 'par' : 'pend');
                        
                        return h(React.Fragment, { key: r.id },
                            h('tr', null,
                                h('td', null, h('input', { type: 'checkbox', checked: selected.has(r.id), onChange: () => toggleRow(r.id) })),
                                h('td', { style: { fontSize: '0.85rem' } }, r.date),
                                h('td', { className: 'bold' }, r.trader),
                                h('td', null, 
                                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                                        r.item,
                                        (r.payments?.length > 1) && h('span', { style: { fontSize: '0.7rem', background: 'rgba(124, 58, 237, 0.1)', color: '#8b5cf6', padding: '2px 6px', borderRadius: 4, fontWeight: 700 } }, `분할 ${r.payments.length}회`)
                                    )
                                ),
                                h('td', { className: 'pn' }, N(sales)),
                                h('td', { className: 'pn' }, N(vat)),
                                h('td', { className: 'pn bold' }, N(total)),
                                h('td', { className: 'pn', style: { color: 'var(--success)' } }, N(paid)),
                                h('td', { className: 'pn', style: { background: remain < 0 ? 'rgba(244, 63, 94, 0.05)' : 'rgba(255,255,100,0.03)', color: remain < 0 ? 'var(--accent)' : 'inherit' } }, N(remain)),
                                h('td', null, 
                                    status === 'ok' && h('span', { className: 'badge b-ok' }, '수금완료'),
                                    status === 'par' && h('span', { className: 'badge b-par' }, '일부수금'),
                                    status === 'pend' && h('span', { className: 'badge b-pend' }, '미수금')
                                ),
                                h('td', null,
                                    h('div', { className: 'act-row' },
                                        h('button', { className: 'pay-btn-v', onClick: () => setPayIdx(isPayOpen ? null : i) }, 
                                            h('span', null, '💰 ', r.payments?.length || 0, '건'), h('i', { className: isPayOpen ? 'ph ph-caret-up' : 'ph ph-caret-down' })
                                        ),
                                        h('button', { className: 'act-btn edit', onClick: () => setModal(r) }, h('i', { className: 'ph ph-pencil-simple' })),
                                        h('button', { className: 'act-btn del', onClick: () => { if(confirm('삭제하시겠습니까?')) setRows(rows.filter(x=>x.id!==r.id)) } }, h('i', { className: 'ph ph-trash' }))
                                    )
                                )
                            ),
                            isPayOpen && h('tr', null, h('td', { colSpan: 11, style: { padding: 0 } }, h(PayPanel, { row: r, onClose: () => setPayIdx(null), onSave: saveRow })))
                        );
                    }))
                )
            ),

            view === 'traders' && h('div', { className: 'trader-list' },
                traders.map(t => {
                    const tRows = rows.filter(r => r.trader === t);
                    const tTotal = tRows.reduce((a, b) => a + (+b.amount || 0) + (+b.vat || 0), 0);
                    const tPaid = tRows.reduce((a, b) => a + (b.payments || []).reduce((s, p) => s + p.amt, 0), 0);
                    return h('div', { className: 'trader-card glass', key: t },
                        h('h4', null, t),
                        h('div', { className: 'trader-details' },
                            h('span', null, '거래:', h('b', null, tRows.length + '건')),
                            h('span', null, '매출:', h('b', null, N(tTotal))),
                            h('span', { style: { color: (tTotal - tPaid) > 0 ? 'var(--accent)' : 'var(--success)' } }, '미수:', h('b', null, N(tTotal - tPaid)))
                        )
                    );
                })
            ),

            view === 'settings' && h('div', { className: 'ledger-container glass', style: { maxWidth: 500 } },
                h('h2', { style: { marginBottom: 20 } }, '⚙️ 시스템 설정'),
                h('div', { style: { marginBottom: 25 } },
                    h('h4', { style: { marginBottom: 10 } }, '☁️ 클라우드 동기화'),
                    h('p', { style: { fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 15 } }, '연동 코드를 사용해 다른 PC와 데이터를 공유합니다.'),
                    h('input', { 
                        className: 'fi', 
                        style: { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: 10, borderRadius: 8, width: '100%', color: '#fff', marginBottom: 10 }, 
                        placeholder: '연동 코드 입력 (예: my-pc-sync)',
                        value: syncKey,
                        onChange: e => setSyncKey(e.target.value)
                    }),
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                        h('button', { className: 'btn-submit', style: { margin: 0, background: 'var(--secondary)' }, onClick: () => syncData('up') }, '데이터 올리기'),
                        h('button', { className: 'btn-submit', style: { margin: 0, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }, onClick: () => syncData('down') }, '데이터 받기')
                    )
                ),
                h('div', null,
                    h('h4', { style: { marginBottom: 10 } }, '💾 로컬 백업'),
                    h('button', { className: 'btn-submit', style: { margin: 0, background: 'var(--success)' }, onClick: () => {
                        const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `매출관리_백업_${TODAY}.json`; a.click();
                    } }, '파일로 내보내기')
                )
            )
        ),

        /* Modal Rendering */
        modal && h(Modal, { init: modal.id ? modal : null, traders, onSave: saveRow, onClose: () => setModal(null) })
    );
}

ReactDOM.createRoot(document.getElementById('app')).render(h(App));
