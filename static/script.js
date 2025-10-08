/**
 * 水球スコア記録アプリのメインスクリプト
 * @version 2.2.0
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- HTML要素の取得 ---
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
    let timeInput = "";
    let records = [];
    let selectedNumber = null;
    let selectedColor = null;
    let selectedEvent = null;
    let recordIdToEdit = null;

    // --- ローカルストレージ関連 ---
    /**
     * 現在の状態をブラウザのローカルストレージに保存します。
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
        for (let i = 1; i <= 14; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            editNumberSelect.appendChild(option);
        }

        loadState();
    };

    // --- イベントハンドラ関数 ---
    /**
     * 番号・色・イベントボタンのクリックを処理します。
     */
    const handleButtonClick = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton || !clickedButton.dataset.value) return;
        const container = clickedButton.closest('.button-group');
        if (!container) return; 
        const value = clickedButton.dataset.value;

        if (container.id.includes('event-buttons')) {
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
     */
    const handleEditClick = (e) => {
        const idToEdit = Number(e.target.dataset.id);
        const record = records.find(r => r.id === idToEdit);
        if (record) {
            recordIdToEdit = idToEdit;
            editNumberSelect.value = '1';
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
            number: selectedNumber || '-',
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
     */
    const render = () => {
        // Step 1: 記録を時系列でソートし、ピリオド、途中経過スコア、記録番号を事前に計算
        records.sort((a, b) => a.id - b.id);

        let periodCounter = 0;
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => event.includes('得点');

        // 各recordオブジェクトに計算結果を保存
        records.forEach((record, index) => {
            record.chronologicalId = String(index + 1).padStart(3, '0'); // 記録番号をここで確定
            if (record.event.includes('センターボール')) {
                periodCounter++;
            }
            record.period = (periodCounter === 0) ? 1 : periodCounter;
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            record.scoreWhite = runningScoreWhite;
            record.scoreBlue = runningScoreBlue;
        });

        // Step 2: スコアボードの最終スコアとピリオドを更新
        periodDisplay.textContent = periodCounter;
        scoreWhiteDisplay.textContent = runningScoreWhite;
        scoreBlueDisplay.textContent = runningScoreBlue;

        // Step 3: 表示用に、記録を「ピリオドは降順」「時間は昇順」にソート
        const displayRecords = [...records].sort((a, b) => {
            if (a.period !== b.period) return b.period - a.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return timeToSec(a.time) - timeToSec(b.time);
        });

        // Step 4: 記録一覧を描画
        recordList.innerHTML = "";
        displayRecords.forEach(record => {
            const eventShort = record.event.split(' ')[0];
            const row = document.createElement('tr');

            let actionButtonsHTML = '';
            if (record.number === '?') {
                actionButtonsHTML = `<button class="edit-btn" data-id="${record.id}">修</button>`;
            } else {
                actionButtonsHTML = `<button class="delete-btn" data-id="${record.id}">×</button>`;
            }

            // ★★★★★ 修正点 ★★★★★
            // 未定義の`recordId`を`record.chronologicalId`に修正。
            // スコア表示を`record.scoreWhite`と`record.scoreBlue`に修正。
            row.innerHTML = `<td>${record.chronologicalId}</td><td>${record.period}</td><td>${record.time}</td><td>${record.number}</td><td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td><td>${eventShort}</td><td>${record.scoreWhite}</td><td>${record.scoreBlue}</td>
                             <td class="actions-cell">${actionButtonsHTML}</td>`;
            recordList.appendChild(row);
        });

        // Step 5: 操作ボタンにイベントリスナーを再設定
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));

        // Step 6: 退水管理テーブルを更新
        renderExclusionTable();
    };

    /**
     * 退水管理テーブルを再描画します。
     */
    const renderExclusionTable = () => {
        // Step 1: テーブルの全セルをクリア
        document.querySelectorAll('#exclusion-table tbody td').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('excluded');
        });

        const foulEvents = ['E ', 'P ', 'SR ', 'SV '];

        // Step 2: ファウル関連の記録を抽出
        const exclusionRecords = records.filter(r => r.number && r.number !== '?' && foulEvents.some(event => r.event.startsWith(event)));

        const foulCounts = {}; // ファウル数を管理するオブジェクト

        // Step 3: 全てのファウル記録をループ処理
        exclusionRecords.forEach(record => {
            const key = `${record.color}-${record.number}`;
            const cellId = `fouls-${record.color === '白' ? 'white' : 'blue'}-${record.number}`;
            const cell = document.getElementById(cellId);

            if (cell) {
                // 新しい<div>要素を作成してファウル情報を格納
                const foulElement = document.createElement('div');
                const eventCode = record.event.split(' ')[0].replace('EG', 'E').replace('PG', 'P');
                foulElement.textContent = `${eventCode}${record.period} ${record.time}`;

                // ★★★ prepend() を使って、セルの【一番上】に新しい要素を追加 ★★★
                cell.prepend(foulElement);

                // ファウル数をカウントアップ
                if (!foulCounts[key]) foulCounts[key] = { count: 0, hasSV: false };
                foulCounts[key].count++;
                if (record.event.startsWith('SV ')) foulCounts[key].hasSV = true;
            }
        });

        // Step 4: ファウル数に応じてセルの背景色を更新
        for (const key in foulCounts) {
             const [color, number] = key.split('-');
             const cellId = `fouls-${color === '白' ? 'white' : 'blue'}-${number}`;
             const cell = document.getElementById(cellId);
             if (cell && (foulCounts[key].count >= 3 || foulCounts[key].hasSV)) {
                 cell.classList.add('excluded');
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
        let formattedTime = "0:00"; // 1. 初期値を"0:00"に設定

        // 2. 入力された文字数に応じて表示をフォーマット
        if (timeInput.length === 1) {
            formattedTime = `0:0${timeInput}`;
        } else if (timeInput.length === 2) {
            formattedTime = `0:${timeInput}`;
        } else if (timeInput.length === 3) {
            formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        } else if (timeInput.length === 4) {
            const minutes = parseInt(timeInput.slice(0, 1), 10);
            const seconds = timeInput.slice(1, 3);
            // 4桁入力時の不正なフォーマットを修正
            if (minutes <= 8) {
                 formattedTime = `${minutes}:${seconds}`; 
            } else {
                 // 8分を超える入力があった場合は、最後の入力を無効にする
                 timeInput = timeInput.slice(0, 3);
                 formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
            }
        }

        timeDisplay.value = formattedTime;
    };

    // --- アプリケーションの実行開始 ---
    initializeApp();
});