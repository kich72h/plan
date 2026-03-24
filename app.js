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
        const container = e.target.closest('.modal-content') || e.target.closest('form') || e.target.closest('.mbody') || e.target.closest('.pp-add-grid');
        if (!container) return;
        const inputs = Array.from(container.querySelectorAll('input:not([readonly]), select, .btn-submit, .pp-add-btn'));
        const idx = inputs.indexOf(e.target);
        if (idx > -1 && idx < inputs.length - 1) {
            e.preventDefault();
            inputs[idx + 1].focus();
        } else if (idx === inputs.length - 1) {
            e.preventDefault();
            inputs[idx].click();
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
    const isAdmin = localStorage.getItem('ag_user_role') === 'admin';
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
                        h('td', null, isAdmin && h('button', { className: 'pp-del-btn', onClick: () => delPay(p.id) }, '×'))
                    );
                })
            )
        ),
        /* 신규 수금 입력창 */
        isAdmin && h('div', { className: 'pp-add-box' },
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
                    FLat(3, '품목'), h('input', { type: 'text', style: { width: '100%' }, value: item, onChange: e => setItem(e.target.value), list: 'i-list', placeholder: '품목 선택/입력', onKeyDown: handleEnter })
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
    const [view, setView] = useState('ledger'); // Default to ledger to show the main feature
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [payIdx, setPayIdx] = useState(null); 
    const [syncKey, setSyncKey] = useState(localStorage.getItem('ag_sync_key') || '');
    const [traderDetail, setTraderDetail] = useState(null); 
    const [showSidebar, setShowSidebar] = useState(false); 
    const [staffList, setStaffList] = useState(() => JSON.parse(localStorage.getItem('ag_staff_list') || '[]'));
    const [newStaff, setNewStaff] = useState('');
    const role = useMemo(() => localStorage.getItem('ag_user_role') || 'staff', []);

    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const isAdmin = role === 'admin';

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

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

    useEffect(() => {
        localStorage.setItem('ag_staff_list', JSON.stringify(staffList));
    }, [staffList]);

    // Daily Auto Backup Logic
    useEffect(() => {
        if (rows.length === 0) return;
        const lastBackup = localStorage.getItem('ag_last_backup_date');
        if (lastBackup !== TODAY) {
            // Keep up to 7 days, remove older to save space
            try {
                localStorage.setItem(`ag_backup_${TODAY}`, JSON.stringify({ rows, staffList }));
                localStorage.setItem('ag_last_backup_date', TODAY);
                console.log(`Auto backup created for ${TODAY}`);
            } catch (e) { console.error('Auto backup failed, localStorage might be full.', e); }
        }
    }, [rows, staffList, TODAY]);


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

    const traders = useMemo(() => Array.from(new Set(rows.map(r => r.trader))).sort(), [rows]);
    const items = useMemo(() => Array.from(new Set(rows.map(r => r.item))).sort(), [rows]);

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        return rows.filter(r => r.trader.toLowerCase().includes(s) || r.item.toLowerCase().includes(s));
    }, [rows, search]);

    const sortedFiltered = useMemo(() => {
        const sorted = [...filtered].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            
            // Special handling for calculated columns if needed
            if (sortConfig.key === 'total') {
                aVal = (+a.amount || 0) + (+a.vat || 0);
                bVal = (+b.amount || 0) + (+b.vat || 0);
            } else if (sortConfig.key === 'paid') {
                aVal = (a.payments || []).reduce((s, p) => s + p.amt, 0);
                bVal = (b.payments || []).reduce((s, p) => s + p.amt, 0);
            } else if (sortConfig.key === 'remain') {
                aVal = ((+a.amount || 0) + (+a.vat || 0)) - (a.payments || []).reduce((s, p) => s + p.amt, 0);
                bVal = ((+b.amount || 0) + (+b.vat || 0)) - (b.payments || []).reduce((s, p) => s + p.amt, 0);
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [filtered, sortConfig]);

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
        h('div', { className: `sidebar-overlay ${showSidebar ? 'active' : ''}`, onClick: () => setShowSidebar(false) }),
        /* Sidebar */
        h('aside', { className: `sidebar ${showSidebar ? 'open' : ''}` },
            h('div', { className: 'logo' }, h('i', { className: 'ph ph-notebook ph-fill' }), h('span', { style: { fontSize: '1.1rem' } }, 'The PLAN')),
            h('nav', { className: 'main-nav' },
                h('button', { className: `nav-item ${view === 'dashboard' ? 'active' : ''}`, onClick: () => { setView('dashboard'); setShowSidebar(false); setSelected(new Set()); } }, h('i', { className: 'ph ph-chart-pie' }), ' 대시보드'),
                h('button', { className: `nav-item ${view === 'ledger' ? 'active' : ''}`, onClick: () => { setView('ledger'); setShowSidebar(false); setSelected(new Set()); } }, h('i', { className: 'ph ph-list-bullets' }), ' 매출장부'),
                h('button', { className: `nav-item ${view === 'traders' ? 'active' : ''}`, onClick: () => { setView('traders'); setShowSidebar(false); setSelected(new Set()); } }, h('i', { className: 'ph ph-users' }), ' 거래처목록'),
                isAdmin && h('button', { className: `nav-item ${view === 'settings' ? 'active' : ''}`, onClick: () => { setView('settings'); setShowSidebar(false); setSelected(new Set()); } }, h('i', { className: 'ph ph-gear' }), ' 설정')
            ),


            h('div', { className: 'sidebar-footer' },
                h('button', { id: 'btn-logout', style: { width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--accent)', color: 'var(--accent)', background: 'none', cursor: 'pointer' }, onClick: () => { if (confirm('로그아웃?')) { localStorage.removeItem('ag_auth'); location.href = 'login.html'; } } }, h('i', { className: 'ph ph-sign-out' }), ' 로그아웃')
            )
        ),

        /* Main */
        h('main', { className: 'main-content' },
            /* Header */
            h('header', { className: 'top-header' },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 15 } },
                    h('button', { className: 'menu-btn', onClick: () => setShowSidebar(true) }, h('i', { className: 'ph ph-list' })),
                    h('div', { className: 'search-bar', style: { flex: 1 } }, h('i', { className: 'ph ph-magnifying-glass' }), h('input', { placeholder: '검색어 입력...', value: search, onChange: e => setSearch(e.target.value) }))
                ),

                h('div', { style: { display: 'flex', alignItems: 'center', gap: 15 } },
                    h('select', { 
                        style: { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: '#fff', padding: '8px 12px', borderRadius: 10, outline: 'none', cursor: 'pointer' },
                        onChange: e => setSearch(e.target.value === 'all' ? '' : e.target.value)
                    },
                        h('option', { value: 'all' }, '전체 거래처'),
                        traders.map(t => h('option', { key: t, value: t }, t))
                    ),
                    h('div', { className: 'user-profile' },
                        h('span', { id: 'current-date', style: { display: 'flex', flexDirection: 'column', textAlign: 'right', fontSize: '0.85rem' } }, 
                            h('b', { style: { color: 'var(--text-main)', fontSize: '1rem' } }, localStorage.getItem('ag_user_name') || '사용자'), 
                            TODAY
                        ),
                        h('div', { className: 'auth-info', style: { display: 'flex', alignItems: 'center', gap: 10 } },
                            h('span', { className: 'badge', style: { background: isAdmin ? 'var(--primary)' : 'rgba(255,255,255,0.1)' } }, isAdmin ? '관리자' : '직원'),
                            h('button', { 
                                className: 'act-btn', 
                                style: { width: 'auto', padding: '0 8px', fontSize: '0.75rem' },
                                onClick: () => { localStorage.removeItem('ag_auth'); window.location.reload(); }
                            }, '로그아웃')
                        )
                    )
                )
            ),

            /* Bulk Bar */
            selected.size > 0 && h('div', { className: 'bulk-bar', style: { background: 'var(--primary)', color: '#fff', padding: '10px 15px', borderRadius: 12, marginBottom: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slideUp 0.3s', flexWrap: 'wrap', gap: 10 } },
                h('span', { style: { fontWeight: 700, fontSize: '0.9rem' } }, `${selected.size}건 선택됨`),
                h('div', { style: { display: 'flex', gap: 8 } },
                    h('button', { 
                        className: 'btn-delete', 
                        style: { background: 'rgba(244,63,94,0.2)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', opacity: isAdmin ? 1 : 0.5, border: 'none' }, 
                        onClick: isAdmin ? deleteRows : () => showToast('관리자 권한이 필요합니다.')
                    }, '선택 삭제'),
                    h('button', { className: 'btn-sm', style: { background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '6px 12px' }, onClick: () => setSelected(new Set()) }, '취소')
                )
            ),

            view === 'dashboard' && h('div', null,
                /* Stitch AI Dashboard Hero Cards */
                h('div', { style: { display: 'flex', gap: 15, marginBottom: 25, flexDirection: window.innerWidth <= 600 ? 'column' : 'row' } },
                    h('div', { style: { flex: 1, background: 'linear-gradient(135deg, rgba(15,25,48,0.9), rgba(9,19,40,0.9))', padding: '25px 20px', borderRadius: 20, borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' } },
                        h('div', { style: { color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 8, fontWeight: 500 } }, '💸 총 매출액 (Total Sales)'),
                        h('div', { style: { fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' } }, N(stats.t), '원'),
                        h('div', { style: { position: 'absolute', right: -15, bottom: -15, opacity: 0.05, fontSize: '6rem' } }, '📈')
                    ),
                    h('div', { style: { flex: 1, background: 'linear-gradient(135deg, rgba(15,25,48,0.9), rgba(9,19,40,0.9))', padding: '25px 20px', borderRadius: 20, borderTop: '1px solid rgba(255,255,255,0.1)', borderLeft: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' } },
                        h('div', { style: { color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 8, fontWeight: 500 } }, '⚠️ 미수 잔액 (Unpaid)'),
                        h('div', { style: { fontSize: '2.2rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.02em' } }, N(stats.b), '원'),
                        h('div', { style: { position: 'absolute', right: -15, bottom: -15, opacity: 0.1, fontSize: '6rem', color: 'var(--accent)' } }, '⏳')
                    )
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
                h('div', { className: 'list-header' }, 
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 15 } }, h('h2', null, '매출 내역 관리'), h('span', { className: 'count-badge' }, `${filtered.length}건`)),
                    isAdmin && h('button', { className: 'btn-add-sales', onClick: () => setModal({}) }, h('i', { className: 'ph ph-plus' }), ' 신규 등록')
                ),
                h('table', { className: 'ledger-table' },
                    h('thead', null, h('tr', null,
                        h('th', { style: { width: 40 } }, h('input', { type: 'checkbox', checked: selected.size > 0 && selected.size === filtered.length, onChange: toggleAll })),
                        [['date', '날짜'], ['trader', '거래처'], ['item', '품목/내용'], ['amount', '매출금액'], ['vat', '부가세'], ['total', '합계금액'], ['paid', '수금합계'], ['remain', '누적잔액']].map(([key, label]) => 
                            h('th', { key, style: { cursor: 'pointer' }, onClick: () => requestSort(key) }, label, sortConfig.key === key && h('span', { style: { marginLeft: 4 } }, sortConfig.direction === 'asc' ? '▲' : '▼'))
                        ),
                        h('th', null, '관리')
                    )),
                    h('tbody', null, sortedFiltered.map((r, i) => {
                        const total = (+r.amount || 0) + (+r.vat || 0);
                        const paid = (r.payments || []).reduce((s, p) => s + p.amt, 0);
                        const remain = total - paid;
                        const isPayOpen = payIdx === i;
                        const status = remain <= 0 ? 'ok' : (paid > 0 ? 'par' : 'pend');
                        
                        return h(React.Fragment, { key: r.id },
                            h('tr', null,
                                h('td', null, h('input', { type: 'checkbox', checked: selected.has(r.id), onChange: () => toggleRow(r.id) })),
                                h('td', null, r.date), h('td', { className: 'bold' }, r.trader), h('td', null, r.item),
                                h('td', { className: 'pn' }, N(r.amount)), h('td', { className: 'pn' }, N(r.vat)), h('td', { className: 'pn bold' }, N(total)),
                                h('td', { className: 'pn', style: { color: 'var(--success)' } }, N(paid)),
                                h('td', { className: 'pn', style: { color: remain > 0 ? 'var(--accent)' : 'inherit' } }, N(remain)),
                                h('td', null, h('div', { className: 'act-row' },
                                    h('button', { className: 'pay-btn-v', onClick: () => setPayIdx(isPayOpen ? null : i) }, h('i', { className: isPayOpen ? 'ph ph-caret-up' : 'ph ph-caret-down' })),
                                    isAdmin && h('button', { className: 'act-btn edit', onClick: () => setModal(r) }, h('i', { className: 'ph ph-pencil-simple' })),
                                    isAdmin && h('button', { className: 'act-btn del', onClick: () => { if(confirm('삭제하시겠습니까?')) setRows(rows.filter(x=>x.id!==r.id)) } }, h('i', { className: 'ph ph-trash' }))
                                ))
                            ),
                            isPayOpen && h('tr', null, h('td', { colSpan: 11, style: { padding: 0 } }, h(PayPanel, { row: r, onClose: () => setPayIdx(null), onSave: saveRow })))
                        );
                    }))
                )
            ),

            view === 'traders' && h('div', { className: 'ledger-container glass' },
                h('div', { className: 'list-header' }, h('h2', null, '거래처 목록 및 현황')),
                h('table', { className: 'ledger-table' },
                    h('thead', null, h('tr', null, h('th', null, '거래처명'), h('th', null, '건수'), h('th', null, '매출총액'), h('th', null, '수금합계'), h('th', null, '미수금액'), h('th', null, '수금율'), h('th', null, '상세'))),
                    h('tbody', null, traders.map(t => {
                        const tRows = rows.filter(r => r.trader === t);
                        const tTotal = tRows.reduce((a, b) => a + (+b.amount || 0) + (+b.vat || 0), 0);
                        const tPaid = tRows.reduce((a, b) => a + (b.payments || []).reduce((s, p) => s + p.amt, 0), 0);
                        const tRemain = tTotal - tPaid;
                        const rate = tTotal > 0 ? Math.floor((tPaid / tTotal) * 100) : 0;
                        return h('tr', { key: t },
                            h('td', { className: 'bold' }, t), h('td', null, tRows.length), h('td', { className: 'pn' }, N(tTotal)), h('td', { className: 'pn', style: { color: 'var(--success)' } }, N(tPaid)), h('td', { className: 'pn', style: { color: tRemain > 0 ? 'var(--accent)' : 'inherit' } }, N(tRemain)),
                            h('td', null, h('span', { className: `rate-badge ${rate >= 90 ? 'rate-high' : rate >= 50 ? 'rate-mid' : 'rate-low'}` }, `${rate}%`)),
                            h('td', null, h('button', { className: 'pay-btn-v', onClick: () => setTraderDetail(t) }, '내역보기'))
                        );
                    }))
                )
            ),

            view === 'settings' && isAdmin && h('div', { className: 'ledger-container glass', style: { maxWidth: 500 } },
                h('h2', { style: { marginBottom: 20 } }, '⚙️ 시스템 설정'),
                /* 직원 관리 */
                h('div', { style: { marginBottom: 30, padding: 15, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--glass-border)' } },
                    h('h4', { style: { marginBottom: 12, color: 'var(--secondary)' } }, '👤 직원 등록 및 관리 (구글 계정)'),
                    h('div', { style: { display: 'flex', gap: 8, marginBottom: 15 } },
                        h('input', { className: 'fi', style: { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: 10, borderRadius: 8, flex: 1, color: '#fff' }, placeholder: '직원의 구글 이메일 입력 (예: user@gmail.com)', value: newStaff, onChange: e => setNewStaff(e.target.value) }),
                        h('button', { className: 'btn-submit', style: { margin: 0, width: 'auto', padding: '0 20px' }, onClick: () => { if (!newStaff) return; setStaffList([...staffList, { id: Date.now(), name: newStaff }]); setNewStaff(''); showToast('등록 완료'); } }, '등록')
                    ),
                    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                        staffList.map(s => h('div', { key: s.id, className: 'badge', style: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 20 } },
                            s.name, h('i', { className: 'ph ph-x', style: { cursor: 'pointer', fontSize: '0.86rem' }, onClick: () => setStaffList(staffList.filter(x => x.id !== s.id)) })
                        )),
                        staffList.length === 0 && h('span', { style: { fontSize: '0.8rem', color: 'var(--text-dim)' } }, '등록된 직원이 없습니다.')
                    )
                ),
                /* 클라우드 동기화 */
                h('div', { style: { marginBottom: 25 } },
                    h('h4', { style: { marginBottom: 10 } }, '☁️ 클라우드 동기화'),
                    h('input', { className: 'fi', style: { background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: 10, borderRadius: 8, width: '100%', color: '#fff', marginBottom: 10 }, placeholder: '연동 코드 입력', value: syncKey, onChange: e => setSyncKey(e.target.value) }),
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                        h('button', { className: 'btn-submit', style: { margin: 0, background: 'var(--secondary)' }, onClick: () => syncData('up') }, '데이터 올리기'),
                        h('button', { className: 'btn-submit', style: { margin: 0, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }, onClick: () => syncData('down') }, '데이터 받기')
                    )
                ),
                /* 로컬 백업 및 복구 */
                h('div', null,
                    h('h4', { style: { marginBottom: 10 } }, '💾 로컬 자동 및 수동 백업'),
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 15 } },
                        h('button', { className: 'btn-submit', style: { margin: 0, background: 'var(--success)' }, onClick: () => {
                            const blob = new Blob([JSON.stringify({ rows, staffList })], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = `매출관리_백업_${TODAY}.json`; a.click();
                        } }, '파일로 내보내기 (수동)'),
                        
                        h('label', { className: 'btn-submit', style: { margin: 0, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 
                            '데이터 파일 복구하기',
                            h('input', { type: 'file', accept: '.json', style: { display: 'none' }, onChange: (e) => {
                                const file = e.target.files[0];
                                if(!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                    try {
                                        const data = JSON.parse(evt.target.result);
                                        if(data.rows && Array.isArray(data.rows)) {
                                            if(confirm(`총 ${data.rows.length}건의 데이터를 복구하시겠습니까? 기존 데이터는 덮어씌워집니다.`)) {
                                                setRows(data.rows);
                                                if(data.staffList) setStaffList(data.staffList);
                                                showToast('데이터가 성공적으로 복구되었습니다.');
                                            }
                                        } else { alert('정상적인 백업 파일이 아닙니다.'); }
                                    } catch(err) { alert('파일 읽기 오류: ' + err.message); }
                                    e.target.value = ''; // Reset file input
                                };
                                reader.readAsText(file);
                            } })
                        )
                    ),
                    h('p', { style: { fontSize: '0.8rem', color: 'var(--text-dim)' } }, '* 매일 앱 실행 시 브라우저 내부에 자동 백업이 한 번씩 진행됩니다.')
                )
            )
        ),

        /* Global Elements */
        h('datalist', { id: 't-list' }, traders.map(t => h('option', { key: t, value: t }))),
        h('datalist', { id: 'i-list' }, items.map(i => h('option', { key: i, value: i }))),
        modal && h(Modal, { init: modal.id ? modal : null, traders, onSave: saveRow, onClose: () => setModal(null) }),
        traderDetail && (() => {
            const tRows = rows.filter(r => r.trader === traderDetail).sort((a,b) => a.date > b.date ? -1 : 1);
            const tTotal = tRows.reduce((a,b) => a + (+b.amount||0) + (+b.vat||0), 0);
            const tPaid = tRows.reduce((a,b) => a + (b.payments||[]).reduce((s,p) => s + p.amt, 0), 0);
            const tRemain = tTotal - tPaid;
            const rate = tTotal > 0 ? Math.floor((tPaid / tTotal) * 100) : 0;

            return h('div', { className: 'modal active', onClick: e => e.target === e.currentTarget && setTraderDetail(null) },
                h('div', { className: 'modal-content glass trader-history-modal', style: { maxWidth: 850, width: '90%' } },
                    h('div', { className: 'modal-header', style: { borderBottom: '1px solid var(--glass-border)', paddingBottom: 15 } }, 
                        h('h3', { style: { fontSize: '1.4rem' } }, h('b', { style: { color: 'var(--secondary)' } }, traderDetail), ' 상세 내역 및 현황'), 
                        h('button', { className: 'close-modal', onClick: () => setTraderDetail(null) }, '×')
                    ),
                    h('div', { className: 'mbody', style: { padding: '20px 0' } },
                        /* Summary Stats */
                        h('div', { style: { display: 'flex', gap: 15, marginBottom: 25, flexWrap: 'wrap' } },
                            h('div', { style: { flex: 1, minWidth: 150, background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, border: '1px solid var(--glass-border)' } },
                                h('div', { style: { fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 5 } }, '총 매출액'),
                                h('div', { style: { fontSize: '1.4rem', fontWeight: 700 } }, N(tTotal), '원')
                            ),
                            h('div', { style: { flex: 1, minWidth: 150, background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, border: '1px solid var(--glass-border)' } },
                                h('div', { style: { fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 5 } }, '수금 완료'),
                                h('div', { style: { fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' } }, N(tPaid), '원')
                            ),
                            h('div', { style: { flex: 1, minWidth: 150, background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, border: '1px solid var(--glass-border)' } },
                                h('div', { style: { fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 5 } }, '미수 잔액'),
                                h('div', { style: { fontSize: '1.4rem', fontWeight: 700, color: tRemain > 0 ? 'var(--accent)' : 'inherit' } }, N(tRemain), '원')
                            ),
                            h('div', { style: { flex: 1, minWidth: 100, background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                                h('div', { style: { fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 5 } }, '수금율'),
                                h('div', { style: { fontSize: '1.4rem', fontWeight: 700, color: rate >= 90 ? 'var(--success)' : (rate >= 50 ? '#f59e0b' : 'var(--accent)') } }, rate, '%')
                            )
                        ),
                        /* Detail Table */
                        h('div', { style: { maxHeight: '400px', overflowY: 'auto', borderRadius: 12, border: '1px solid var(--glass-border)' } },
                            h('table', { className: 'ledger-table', style: { width: '100%' } },
                                h('thead', { style: { position: 'sticky', top: 0, background: 'rgba(20,25,35,0.95)', zIndex: 1 } }, 
                                    h('tr', null, h('th', null, '거래일자'), h('th', null, '품목/내용'), h('th', { style: { textAlign: 'right' } }, '해당건 총액'), h('th', { style: { textAlign: 'right' } }, '해당건 수금'), h('th', { style: { textAlign: 'right' } }, '건별 잔액'))
                                ),
                                h('tbody', null, tRows.map(r => {
                                    const total = (+r.amount || 0) + (+r.vat || 0);
                                    const paid = (r.payments || []).reduce((s, p) => s + p.amt, 0);
                                    const remain = total - paid;
                                    return h('tr', { key: r.id }, 
                                        h('td', null, r.date), 
                                        h('td', { className: 'bold' }, r.item), 
                                        h('td', { className: 'pn', style: { textAlign: 'right' } }, N(total)), 
                                        h('td', { className: 'pn', style: { color: 'var(--success)', textAlign: 'right' } }, N(paid)), 
                                        h('td', { className: 'pn bold', style: { color: remain > 0 ? 'var(--accent)' : 'inherit', textAlign: 'right' } }, N(remain))
                                    );
                                }))
                            )
                        )
                    )
                )
            );
        })()
    );
}

ReactDOM.createRoot(document.getElementById('app')).render(h(App));
