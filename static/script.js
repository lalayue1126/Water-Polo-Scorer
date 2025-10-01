/**
 * 水球スコア記録アプリのメインスクリプト
 * @author Your Name
 * @version 2.0.0
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- HTML要素の取得 ---
    // アプリケーション全体で使うHTML要素をここで一括で取得します。
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
    const resetAllBtn = document.getElementById('reset-all-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const editNumberModal = document.getElementById('edit-number-modal');
    const editNumberSelect = document.getElementById('edit-number-select');
    const editModalSaveBtn = document.getElementById('edit-modal-save-btn');
    const editModalCancelBtn = document.getElementById('edit-modal-cancel-btn');

    // --- アプリケーションの状態管理 ---
    // records配列が全ての情報の原本（Single Source of Truth）となります。
    let timeInput = "";
    let records = [];
    let selectedNumber = null;
    let selectedColor = null;
    let selectedEvent = null;
    let recordIdToEdit = null;

    // --- ローカルストレージ関連 ---
    /**
     * 現在の状態（試合情報と記録）をブラウザのローカルストレージに保存します。
     */
    const saveState = () => {
        const appState = {
            matchDate: matchDateInput.value,
            teamWhite: teamNameWhiteInput.value,
            teamBlue: teamNameBlueInput.value,
            records: records
        };
        localStorage.setItem('waterPoloAppState', JSON.stringify(appState));
    };

    /**
     * ローカルストレージから状態を読み込み、アプリに復元します。
     */
    const loadState = () => {
        const savedState = localStorage.getItem('waterPoloAppState');
        if (savedState) {
            const appState = JSON.parse(savedState);
            records = appState.records || [];
            matchDateInput.value = appState.matchDate || new Date().toISOString().split('T')[0];
            teamNameWhiteInput.value = appState.teamWhite || '';
            teamNameBlueInput.value = appState.teamBlue || '';
            updateTeamLabels();
            render();
        } else {
            matchDateInput.value = new Date().toISOString().split('T')[0];
        }
    };

    // --- 初期化処理 ---
    /**
     * アプリケーションを初期化し、全てのイベントリスナーを設定します。
     */
    const initializeApp = () => {
        // 各種入力イベント
        teamNameWhiteInput.addEventListener('input', () => { updateTeamLabels(); saveState(); });
        teamNameBlueInput.addEventListener('input', () => { updateTeamLabels(); saveState(); });
        matchDateInput.addEventListener('change', saveState);
        playerNumberContainer.addEventListener('click', handleButtonClick);
        teamColorContainer.addEventListener('click', handleButtonClick);
        primaryEventContainer.addEventListener('click', handleButtonClick);
        secondaryEventContainer.addEventListener('click', handleButtonClick);
        calculatorButtons.addEventListener('click', handleCalculator);
        clearTimeBtn.addEventListener('click', () => { timeInput = ""; updateTimeDisplay(); });
        addRecordBtn.addEventListener('click', addRecord);
        exportCsvBtn.addEventListener('click', exportCsv);

        // 全記録リセットの確認モーダル
        resetAllBtn.addEventListener('click', () => confirmModal.style.display = 'flex');
        modalCancelBtn.addEventListener('click', () => confirmModal.style.display = 'none');
        modalConfirmBtn.addEventListener('click', () => {
            records = [];
            localStorage.removeItem('waterPoloAppState');
            teamNameWhiteInput.value = '';
            teamNameBlueInput.value = '';
            matchDateInput.value = new Date().toISOString().split('T')[0];
            updateTeamLabels();
            render();
            resetInputs();
            confirmModal.style.display = 'none';
        });

        // 番号修正モーダルの処理
        editModalSaveBtn.addEventListener('click', () => {
            if (recordIdToEdit) {
                const record = records.find(r => r.id === recordIdToEdit);
                if (record) {
                    record.number = editNumberSelect.value;
                    render();
                    saveState();
                }
            }
            editNumberModal.style.display = 'none';
            recordIdToEdit = null;
        });
        editModalCancelBtn.addEventListener('click', () => {
            editNumberModal.style.display = 'none';
            recordIdToEdit = null;
        });
        // 修正用ドロップダウンの選択肢を生成 (1-14, ?)
        for (let i = 1; i <= 14; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            editNumberSelect.appendChild(option);
        }

        loadState(); // アプリ起動時にデータを読み込む
    };

    // --- イベントハンドラ関数 ---
    /**
     * 番号・色・イベントボタンのクリックを処理します。
     * @param {Event} e - クリックイベント
     */
    const handleButtonClick = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton || !clickedButton.dataset.value) return;

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

    /**
     * 時間入力電卓のクリックを処理します。
     * @param {Event} e - クリックイベント
     */
    const handleCalculator = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.value) return;
        if (timeInput.length < 4) {
            timeInput += button.dataset.value;
            updateTimeDisplay();
        }
    };

    /**
     * 記録一覧の「修」ボタンのクリックを処理します。
     * @param {Event} e - クリックイベント
     */
    const handleEditClick = (e) => {
        const idToEdit = Number(e.target.dataset.id);
        const record = records.find(r => r.id === idToEdit);
        if (record) {
            recordIdToEdit = idToEdit;
            editNumberSelect.value = record.number;
            editNumberModal.style.display = 'flex';
        }
    };

    // --- コアロジック関数 ---
    /**
     * 入力された情報に基づいて新しい記録を追加します。
     */
    const addRecord = () => {
        const timeValue = timeDisplay.value;
        const [minutes, seconds] = timeValue.split(':').map(Number);
        if (seconds >= 60) { alert("秒数は59以下で入力してください。"); timeDisplay.classList.add('error'); return; }
        if (minutes > 8 || (minutes === 8 && seconds > 0)) { alert("エラー: 時間は8:00以内で入力してください。"); timeDisplay.classList.add('error'); return; }

        const numberOptionalEvents = ['TO タイムアウト', 'YC イエローカード', 'RC レッドカード'];
        if (!timeValue || timeValue === "0:00" || !selectedColor || !selectedEvent) {
            alert("時間、色、イベントは必ず選択してください。");
            return;
        }
        const isNumberRequired = !numberOptionalEvents.some(event => selectedEvent.includes(event));
        if (isNumberRequired && !selectedNumber) {
            alert("このイベントには選手番号の選択が必要です。（不明な場合は「？」を選択してください）");
            return;
        }

        const newRecord = {
            id: Date.now(),
            time: timeDisplay.value,
            number: selectedNumber || '-', // 番号不要イベントの場合は'-'を記録
            color: selectedColor,
            event: selectedEvent,
        };
        records.push(newRecord);
        render();
        resetInputs();
        saveState();
    };

    /**
     * 指定されたIDの記録を削除します。
     * @param {Event} e - クリックイベント
     */
    const deleteRecord = (e) => {
        const idToDelete = Number(e.target.dataset.id);
        records = records.filter(record => record.id !== idToDelete);
        render();
        saveState();
    };

    // --- UI更新・補助関数 ---
    /**
     * 全ての表示（スコアボード、記録一覧、退水管理表）を最新の状態に更新するメイン関数です。
     * データの状態が変更された後、必ずこの関数が呼び出されます。
     */
    const render = () => {
        // Step 1: 記録を時系列でソートし、全ての記録のピリオド番号を再計算・再割り当てします。
        records.sort((a, b) => a.id - b.id);
        let periodCounter = 0;
        records.forEach(record => {
            if (record.event.includes('センターボール')) {
                periodCounter++;
            }
            record.period = (periodCounter === 0) ? 1 : periodCounter;
        });

        // Step 2: スコアボードのピリオド表示を更新します。
        periodDisplay.textContent = periodCounter;

        // Step 3: 記録一覧テーブルを描画し、同時にスコアを計算します。
        recordList.innerHTML = "";
        const isGoalEvent = (event) => event.includes('得点');

        // 表示用にピリオドと時間で並べ替えた、新しい記録のコピーを作成します。
        const displayRecords = [...records].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return timeToSec(b.time) - timeToSec(a.time);
        });

        // スコアを計算
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        displayRecords.forEach(record => {
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
        });
        scoreWhiteDisplay.textContent = runningScoreWhite;
        scoreBlueDisplay.textContent = runningScoreBlue;

        // テーブルの各行を生成します。
        runningScoreWhite = 0; // スコアをリセットし、行ごとの累計を正しく表示します。
        runningScoreBlue = 0;
        displayRecords.forEach((record, index) => {
            const recordId = String(index + 1).padStart(3, '0');
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const eventShort = record.event.split(' ')[0];
            const row = document.createElement('tr');

            // ★★★ 変更点: 番号が「？」の場合、更新ボタンを表示するロジック ★★★
            const isEditable = record.number === '?' && ['E ', 'P ', 'SR ', 'SV ', 'EG '].some(code => record.event.startsWith(code));
            let actionButtonsHTML = '';
            if (record.number === '?') {
                actionButtonsHTML = `<button class="edit-btn" data-id="${record.id}">修</button>`;
            } 
            // 番号が確定している場合、削除ボタンのみ表示
            else {
                actionButtonsHTML = `<button class="delete-btn" data-id="${record.id}">×</button>`;
            }

            row.innerHTML = `<td>${recordId}</td><td>${record.period}</td><td>${record.time}</td><td>${record.number}</td><td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td><td>${eventShort}</td><td>${runningScoreWhite}</td><td>${runningScoreBlue}</td>
                             <td class="actions-cell">${actionButtonsHTML}</td>`;
            recordList.appendChild(row);
        });

        // Step 4: 操作ボタンにイベントリスナーを再設定します。
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));

        // Step 5: 退水管理テーブルを更新します。
        renderExclusionTable();
    };

    /**
     * 退水管理テーブルを記録データに基づいて再描画します。
     */
    const renderExclusionTable = () => {
        document.querySelectorAll('#exclusion-table-body td').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('excluded');
        });

        const foulEvents = ['E ', 'P ', 'SR ', 'SV ', 'EG '];
        const exclusionRecords = records.filter(r => r.number && foulEvents.some(event => r.event.startsWith(event)));

        const foulsByPlayer = {};
        exclusionRecords.forEach(record => {
            const key = `${record.color}-${record.number}`;
            if (!foulsByPlayer[key]) foulsByPlayer[key] = [];

            const eventCode = record.event.split(' ')[0].replace('EG', 'E').replace('PG', 'P');
            const foulString = `${eventCode}${record.period} ${record.time}`;
            foulsByPlayer[key].push(foulString);
        });

        for (const playerKey in foulsByPlayer) {
            const [color, number] = playerKey.split('-');
            const cellId = `fouls-${color === '白' ? 'white' : 'blue'}-${number}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                cell.innerHTML = foulsByPlayer[playerKey].join('<br>');
                if (foulsByPlayer[playerKey].length >= 3 || foulsByPlayer[playerKey].some(f => f.startsWith('SV'))) {
                    cell.classList.add('excluded');
                }
            }
        }
    };

    /**
     * 入力フォームとボタンの選択状態をリセットします。
     */
    const resetInputs = () => {
        timeInput = "";
        updateTimeDisplay();
        document.querySelectorAll('.button-group button.selected').forEach(btn => btn.classList.remove('selected'));
        selectedNumber = null;
        selectedColor = null;
        selectedEvent = null;
    };

    /**
     * 記録をCSV形式でダウンロードします。
     */
    const exportCsv = () => {
        if (records.length === 0) { alert("エクスポートする記録がありません。"); return; }
        const matchDate = matchDateInput.value;
        const teamWhite = teamNameWhiteInput.value.trim() || '白';
        const teamBlue = teamNameBlueInput.value.trim() || '青';
        if (!matchDate) { alert("試合の日付を入力してください。"); return; }

        const sanitizedWhite = teamWhite.replace(/[\s\\/:*?"<>|]/g, '_');
        const sanitizedBlue = teamBlue.replace(/[\s\\/:*?"<>|]/g, '_');
        const filename = `waterpolo_record_${matchDate}_${sanitizedWhite}_vs_${sanitizedBlue}.csv`;
        let csvContent = "No,ピリオド,時間,番号,色,イベント,得点(白),得点(青)\n";

        const sortedRecords = [...records].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return timeToSec(b.time) - timeToSec(a.time);
        });

        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => event.includes('得点');
        sortedRecords.forEach((record, index) => {
            const recordId = String(index + 1).padStart(3, '0');
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const eventShort = record.event.split(' ')[0];
            const row = [recordId, record.period, record.time, record.number, record.color, eventShort, runningScoreWhite, runningScoreBlue].join(',');
            csvContent += row + "\n";
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * スコアボードのチーム名表示を更新します。
     */
    const updateTeamLabels = () => {
        const whiteName = teamNameWhiteInput.value.trim();
        const blueName = teamNameBlueInput.value.trim();
        teamLabelWhite.textContent = whiteName ? `白 (${whiteName})` : '白';
        teamLabelBlue.textContent = blueName ? `青 (${blueName})` : '青';
    };

    /**
     * 時間表示ディスプレイをフォーマットして更新します。
     */
    const updateTimeDisplay = () => {
        timeDisplay.classList.remove('error');
        let formattedTime = "0:00";
        if (timeInput.length === 1) formattedTime = `0:0${timeInput}`;
        else if (timeInput.length === 2) formattedTime = `0:${timeInput}`;
        else if (timeInput.length === 3) formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) {
            const minutes = parseInt(timeInput.slice(0, 1), 10);
            const rawSeconds = timeInput.slice(1,3);
            if (minutes <= 8) {
                 formattedTime = `${minutes}:${rawSeconds}${timeInput.slice(3)}`;
            } else {
                 formattedTime = timeDisplay.value; 
            }
        }
        timeDisplay.value = formattedTime;
    };

    // --- アプリケーションの実行開始 ---
    initializeApp();
});