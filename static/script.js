document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得 (変更なし)
    const matchDateInput = document.getElementById('match-date');
    const teamNameWhiteInput = document.getElementById('team-name-white');
    const teamNameBlueInput = document.getElementById('team-name-blue');
    const teamLabelWhite = document.getElementById('team-label-white');
    const teamLabelBlue = document.getElementById('team-label-blue');
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
    let period = 0; let timeInput = ""; let records = [];
    let selectedNumber = null; let selectedColor = null; let selectedEvent = null;

    // --- 初期化 & イベントリスナー設定 ---
    const initializeApp = () => {
        const today = new Date().toISOString().split('T')[0];
        matchDateInput.value = today;

        teamNameWhiteInput.addEventListener('input', updateTeamLabels);
        teamNameBlueInput.addEventListener('input', updateTeamLabels);
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
    const handleButtonClick = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton) return;
        const container = clickedButton.closest('.button-group');
        if (!container) return; 
        const value = clickedButton.dataset.value;
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

    const handleCalculator = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.value) return;
        if (timeInput.length < 4) {
            timeInput += button.dataset.value;
            updateTimeDisplay();
        }
    };

    // ★★★ 変更点1: addRecordからスコア計算ロジックを削除 ★★★
    const addRecord = () => {
        if (timeInput === "" || !selectedNumber || !selectedColor || !selectedEvent) {
            alert("時間とすべての項目を選択してください。");
            return;
        }

        // スコア計算部分を削除

        const newRecord = {
            id: Date.now(),
            period: (selectedEvent === 'センターボール') ? period + 1 : period,
            time: timeDisplay.value,
            number: selectedNumber,
            color: selectedColor,
            event: selectedEvent,
            // scoreWhite と scoreBlue プロパティを削除
        };

        if (newRecord.event === 'センターボール') {
            period++;
        }
        records.push(newRecord);
        renderRecords(); // 表示更新はrenderRecordsに一任
        resetInputs();
    };

    const deleteRecord = (e) => {
        const idToDelete = Number(e.target.dataset.id);
        const recordToDelete = records.find(record => record.id === idToDelete);
        if (recordToDelete && recordToDelete.event === 'センターボール') {
            period--;
        }
        records = records.filter(record => record.id !== idToDelete);
        renderRecords(); // 表示更新はrenderRecordsに一任
    };

    const exportCsv = () => {
        // (この関数は変更なし)
        if (records.length === 0) { alert("エクスポートする記録がありません。"); return; }
        const matchDate = matchDateInput.value;
        const teamWhite = teamNameWhiteInput.value.trim();
        const teamBlue = teamNameBlueInput.value.trim();
        if (!matchDate || !teamWhite || !teamBlue) { alert("試合の日付と両チーム名を入力してください。"); return; }
        const sanitizedWhite = teamWhite.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '');
        const sanitizedBlue = teamBlue.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '');
        const filename = `waterpolo_record_${matchDate}_${sanitizedWhite}_vs_${sanitizedBlue}.csv`;

        // CSV生成時にもスコアをその場で計算する
        let csvContent = "ピリオド,時間,番号,色,イベント,得点(白),得点(青)\n";
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => ['得点', 'ペナルティ得点', '退水得点'].includes(event);

        // renderRecordsと同じようにソートしてから処理
        const sortedRecords = [...records].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeA = a.time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            const timeB = b.time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return timeB - timeA;
        });

        sortedRecords.forEach(record => {
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const row = [record.period, record.time, record.number, record.color, record.event, runningScoreWhite, runningScoreBlue].join(',');
            csvContent += row + "\n";
        });

        const bom = new Uint8Array([0xEF, 0xBB, BF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // --- UI更新 & 補助関数 ---
    const updateTeamLabels = () => {
        const whiteName = teamNameWhiteInput.value.trim();
        const blueName = teamNameBlueInput.value.trim();
        teamLabelWhite.textContent = whiteName ? `白 (${whiteName})` : '白';
        teamLabelBlue.textContent = blueName ? `青 (${blueName})` : '青';
    };

    // ★★★ 変更点2: renderRecordsで毎回スコアを再計算 ★★★
    const renderRecords = () => {
        recordList.innerHTML = "";
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => ['得点', 'ペナルティ得点', '退水得点'].includes(event);

        // 表示前に必ずソートして時系列を正しくする
        records.sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeA = a.time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
            const timeB = b.time.split(':').reduce((acc, time) => 60 * acc + +time, 0);
            return timeB - timeA;
        });

        records.forEach(record => {
            // 現在の記録がゴールイベントなら、累計スコアを更新
            if (isGoalEvent(record.event)) {
                if (record.color === '白') {
                    runningScoreWhite++;
                } else {
                    runningScoreBlue++;
                }
            }

            // 累計スコアを使ってテーブルの行を生成
            const row = document.createElement('tr');
            row.innerHTML = `<td>${record.period}</td><td>${record.time}</td><td>${record.number}</td><td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td><td>${record.event}</td><td>${runningScoreWhite}</td><td>${runningScoreBlue}</td><td><button class="delete-btn" data-id="${record.id}">×</button></td>`;
            recordList.appendChild(row);
        });

        // ループが終わった時点での最終スコアを上部のスコアボードに反映
        scoreWhiteDisplay.textContent = runningScoreWhite;
        scoreBlueDisplay.textContent = runningScoreBlue;
        periodDisplay.textContent = period;

        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
    };

    const resetInputs = () => {
        timeInput = ""; updateTimeDisplay();
        document.querySelectorAll('.button-group button.selected').forEach(btn => btn.classList.remove('selected'));
        selectedNumber = null; selectedColor = null; selectedEvent = null;
    };

    const updateTimeDisplay = () => {
        let ft = "0:00";
        if (timeInput.length === 1) ft = `0:0${timeInput}`;
        else if (timeInput.length === 2) ft = `0:${timeInput}`;
        else if (timeInput.length === 3) ft = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) { const m = parseInt(timeInput.slice(0, 2), 10); if (m < 10) ft = `${parseInt(m, 10)}:${timeInput.slice(2)}`; else ft = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`; }
        timeDisplay.value = ft;
    };

    initializeApp();
});