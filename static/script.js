document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const periodDisplay = document.getElementById('period-display');
    const scoreWhiteDisplay = document.getElementById('score-white');
    const scoreBlueDisplay = document.getElementById('score-blue');
    const timeDisplay = document.getElementById('time-display');
    const calculatorButtons = document.querySelector('.calculator-buttons');
    const clearTimeBtn = document.getElementById('clear-time-btn');
    const addRecordBtn = document.getElementById('add-record-btn');
    const recordList = document.getElementById('record-list');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const playerNumberContainer = document.getElementById('player-number-buttons');
    const teamColorContainer = document.getElementById('team-color-buttons');
    // ★★★ 変更点: イベントボタンのコンテナを2つ取得 ★★★
    const primaryEventContainer = document.getElementById('primary-event-buttons');
    const secondaryEventContainer = document.getElementById('secondary-event-buttons');

    // App state variables
    let period = 0;
    let timeInput = "";
    let records = [];
    let selectedNumber = null;
    let selectedColor = null;
    let selectedEvent = null;

    /**
     * Initializes the application by setting up event listeners.
     */
    const initializeApp = () => {
        // ボタンがHTMLに直書きされたため、JSでの生成は不要

        // イベントリスナーを設定
        playerNumberContainer.addEventListener('click', handleButtonClick);
        teamColorContainer.addEventListener('click', handleButtonClick);
        // ★★★ 変更点: 2つのコンテナにリスナーを設定 ★★★
        primaryEventContainer.addEventListener('click', handleButtonClick);
        secondaryEventContainer.addEventListener('click', handleButtonClick);
    };

    /**
     * Handles clicks on any of the selection buttons.
     * @param {Event} e - The click event.
     */
    const handleButtonClick = (e) => {
        const clickedButton = e.target;
        if (clickedButton.tagName !== 'BUTTON') return;

        const value = clickedButton.dataset.value;
        const container = clickedButton.closest('.button-group');

        // ★★★ 変更点: イベントボタンの選択ロジックを修正 ★★★
        if (container.id === 'primary-event-buttons' || container.id === 'secondary-event-buttons') {
            // イベントボタンがクリックされた場合
            // まず全てのイベントボタンの選択を解除
            primaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            secondaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));

            // クリックされたボタンを選択状態にし、値を更新
            clickedButton.classList.add('selected');
            selectedEvent = value;
        } else { 
            // 番号または色ボタンがクリックされた場合 (従来のロジック)
            container.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            clickedButton.classList.add('selected');
            if (container.id === 'player-number-buttons') selectedNumber = value;
            if (container.id === 'team-color-buttons') selectedColor = value;
        }
    };

    // (これ以降の、時間入力、記録追加、リセット、描画、削除、CSV出力の各関数に変更はありません)
    // --- Time Input Calculator ---
    calculatorButtons.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName !== 'BUTTON' || target.id === 'clear-time-btn') return;
        const value = target.dataset.value;
        if (timeInput.length < 4) { timeInput += value; updateTimeDisplay(); }
    });
    clearTimeBtn.addEventListener('click', () => { timeInput = ""; updateTimeDisplay(); });
    const updateTimeDisplay = () => {
        let ft = "0:00";
        if (timeInput.length === 1) ft = `0:0${timeInput}`; else if (timeInput.length === 2) ft = `0:${timeInput}`;
        else if (timeInput.length === 3) ft = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) { const m = parseInt(timeInput.slice(0, 2), 10); if (m < 10) ft = `${m}:${timeInput.slice(2)}`; else ft = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`; }
        timeDisplay.value = ft;
    };

    // --- Core App Logic ---
    addRecordBtn.addEventListener('click', () => {
        if (timeInput === "" || !selectedNumber || !selectedColor || !selectedEvent) { alert("時間とすべての項目を選択してください。"); return; }
        let scoreWhite = 0, scoreBlue = 0;
        records.forEach(r => { if (['得点', 'ペナルティ得点', '退水得点'].includes(r.event)) { if (r.color === '白') scoreWhite++; else scoreBlue++; } });
        if (['得点', 'ペナルティ得点', '退水得点'].includes(selectedEvent)) { if (selectedColor === '白') scoreWhite++; else scoreBlue++; }
        const currentScore = `${scoreWhite}-${scoreBlue}`;
        const newRecord = { id: Date.now(), period: (selectedEvent === 'センターボール') ? period + 1 : period, time: timeDisplay.value, number: selectedNumber, color: selectedColor, event: selectedEvent, score: currentScore };
        if (newRecord.event === 'センターボール') { period++; }
        records.push(newRecord);
        renderRecords();
        resetInputs();
    });

    const resetInputs = () => {
        timeInput = ""; updateTimeDisplay();
        document.querySelectorAll('.button-group button.selected').forEach(btn => btn.classList.remove('selected'));
        selectedNumber = null; selectedColor = null; selectedEvent = null;
    };

    const renderRecords = () => {
        recordList.innerHTML = ""; let scoreWhite = 0, scoreBlue = 0;
        records.sort((a, b) => { if (a.period !== b.period) return a.period - b.period; const tA = a.time.split(':').reduce((acc, t) => 60 * acc + +t, 0); const tB = b.time.split(':').reduce((acc, t) => 60 * acc + +t, 0); return tB - tA; });
        records.forEach(rec => {
            if (['得点', 'ペナルティ得点', '退水得点'].includes(rec.event)) { if (rec.color === '白') scoreWhite++; else scoreBlue++; }
            const row = document.createElement('tr');
            row.innerHTML = `<td>${rec.period}</td><td>${rec.time}</td><td>${rec.number}</td><td class="${rec.color === '白' ? 'white-cell' : 'blue-cell'}">${rec.color}</td><td>${rec.event}</td><td>${rec.score}</td><td><button class="delete-btn" data-id="${rec.id}">×</button></td>`;
            recordList.appendChild(row);
        });
        scoreWhiteDisplay.textContent = scoreWhite; scoreBlueDisplay.textContent = scoreBlue;
        periodDisplay.textContent = period;
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
    };

    const deleteRecord = (e) => {
        const id = Number(e.target.dataset.id);
        const rec = records.find(r => r.id === id);
        if (rec && rec.event === 'センターボール') { period--; }
        records = records.filter(r => r.id !== id);
        renderRecords();
    };

    // --- CSV Export ---
    exportCsvBtn.addEventListener('click', () => {
        if (records.length === 0) { alert("エクスポートする記録がありません。"); return; }
        let csv = "ピリオド,時間,番号,色,イベント,得点(白-青)\n";
        records.forEach(r => { csv += [r.period, r.time, r.number, r.color, r.event, `"${r.score}"`].join(',') + "\n"; });
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
        const now = new Date(); const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
        a.download = `waterpolo_record_${ts}.csv`;
        a.click(); URL.revokeObjectURL(url);
    });

    // Start the application.
    initializeApp();
});