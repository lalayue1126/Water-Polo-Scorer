document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得 (変更なし)
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
    const primaryEventContainer = document.getElementById('primary-event-buttons');
    const secondaryEventContainer = document.getElementById('secondary-event-buttons');

    // 変数定義 (変更なし)
    let period = 0;
    let timeInput = "";
    let records = [];
    let selectedNumber = null;
    let selectedColor = null;
    let selectedEvent = null;

    // --- 初期化 & イベントリスナー設定 ---
    const initializeApp = () => {
        playerNumberContainer.addEventListener('click', handleButtonClick);
        teamColorContainer.addEventListener('click', handleButtonClick);
        primaryEventContainer.addEventListener('click', handleButtonClick);
        secondaryEventContainer.addEventListener('click', handleButtonClick);
        calculatorButtons.addEventListener('click', handleCalculator);
        clearTimeBtn.addEventListener('click', () => { timeInput = ""; updateTimeDisplay(); });
        addRecordBtn.addEventListener('click', addRecord);
        exportCsvBtn.addEventListener('click', exportCsv);
    };

    // --- イベントハンドラ ---

    const handleCalculator = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.value) return;
        if (timeInput.length < 4) {
            timeInput += button.dataset.value;
            updateTimeDisplay();
        }
    };

    const handleButtonClick = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton) return;

        const container = clickedButton.closest('.button-group');
        const value = clickedButton.dataset.value;

        // 排他選択ロジック
        if (container.id === 'primary-event-buttons' || container.id === 'secondary-event-buttons') {
            primaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            secondaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            selectedEvent = value;
        } else {
            container.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            if (container.id === 'player-number-buttons') selectedNumber = value;
            if (container.id === 'team-color-buttons') selectedColor = value;
        }
        clickedButton.classList.add('selected');
    };

    const addRecord = () => {
        if (timeInput === "" || !selectedNumber || !selectedColor || !selectedEvent) {
            alert("時間とすべての項目を選択してください。");
            return;
        }

        // ★★★ 変更点: スコアを個別に計算・保存 ★★★
        let currentScoreWhite = 0;
        let currentScoreBlue = 0;
        const isGoalEvent = (event) => ['得点', 'ペナルティ得点', '退水得点'].includes(event);

        // 既存レコードからスコアを計算
        records.forEach(r => {
            if (isGoalEvent(r.event)) {
                if (r.color === '白') currentScoreWhite++;
                else currentScoreBlue++;
            }
        });

        // 今回のイベントがゴールならスコアを加算
        if (isGoalEvent(selectedEvent)) {
            if (selectedColor === '白') currentScoreWhite++;
            else currentScoreBlue++;
        }

        const newRecord = {
            id: Date.now(),
            period: (selectedEvent === 'センターボール') ? period + 1 : period,
            time: timeDisplay.value,
            number: selectedNumber,
            color: selectedColor,
            event: selectedEvent,
            scoreWhite: currentScoreWhite, // 白のスコアを保存
            scoreBlue: currentScoreBlue,   // 青のスコアを保存
        };

        if (newRecord.event === 'センターボール') {
            period++;
        }

        records.push(newRecord);
        renderRecords();
        resetInputs();
    };

    const deleteRecord = (e) => {
        const idToDelete = Number(e.target.dataset.id);
        const recordToDelete = records.find(record => record.id === idToDelete);

        if (recordToDelete && recordToDelete.event === 'センターボール') {
            period--;
        }

        records = records.filter(record => record.id !== idToDelete);
        renderRecords();
    };

    const exportCsv = () => {
        if (records.length === 0) {
            alert("エクスポートする記録がありません。");
            return;
        }
        // ★★★ 変更点: CSVヘッダーとデータ行を変更 ★★★
        let csvContent = "ピリオド,時間,番号,色,イベント,得点(白),得点(青)\n";
        records.forEach(record => {
            const row = [record.period, record.time, record.number, record.color, record.event, record.scoreWhite, record.scoreBlue].join(',');
            csvContent += row + "\n";
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        a.download = `waterpolo_record_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- UI更新 & 補助関数 ---

    const renderRecords = () => {
        recordList.innerHTML = "";
        let totalScoreWhite = 0;
        let totalScoreBlue = 0;
        const isGoalEvent = (event) => ['得点', 'ペナルティ得点', '退水得点'].includes(event);

        // ピリオドと時間でソート
        records.sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeA = a.time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
            const timeB = b.time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
            return timeB - timeA;
        });

        records.forEach(record => {
            if (isGoalEvent(record.event)) {
                if (record.color === '白') totalScoreWhite++;
                else totalScoreBlue++;
            }
            // ★★★ 変更点: テーブル行の生成を変更 ★★★
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.period}</td>
                <td>${record.time}</td>
                <td>${record.number}</td>
                <td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td>
                <td>${record.event}</td>
                <td>${record.scoreWhite}</td>
                <td>${record.scoreBlue}</td>
                <td><button class="delete-btn" data-id="${record.id}">×</button></td>
            `;
            recordList.appendChild(row);
        });

        // スコアボードとピリオド表示を更新
        scoreWhiteDisplay.textContent = totalScoreWhite;
        scoreBlueDisplay.textContent = totalScoreBlue;
        periodDisplay.textContent = period;

        // 削除ボタンにイベントリスナーを再設定
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
    };

    const resetInputs = () => {
        timeInput = "";
        updateTimeDisplay();
        document.querySelectorAll('.button-group button.selected').forEach(btn => btn.classList.remove('selected'));
        selectedNumber = null;
        selectedColor = null;
        selectedEvent = null;
    };

    const updateTimeDisplay = () => {
        let formattedTime = "0:00";
        if (timeInput.length === 1) formattedTime = `0:0${timeInput}`;
        else if (timeInput.length === 2) formattedTime = `0:${timeInput}`;
        else if (timeInput.length === 3) formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) {
            const minutes = parseInt(timeInput.slice(0, 2), 10);
            if (minutes < 10) formattedTime = `${parseInt(timeInput.slice(0,2), 10)}:${timeInput.slice(2)}`;
            else formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`;
        }
        timeDisplay.value = formattedTime;
    };

    // アプリケーション開始
    initializeApp();
});