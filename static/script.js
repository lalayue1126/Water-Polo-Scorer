/**
 * 水球スコア記録アプリのメインスクリプト
 * @version 2.3.0 (改良版)
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
    // グローバル変数を減らし、状態を一元管理
    const state = {
        timeInput: "",
        records: [],
        selectedNumber: null,
        selectedColor: null,
        selectedEvent: null,
        recordIdToEdit: null
    };

    // --- ローカルストレージ関連 ---
    /**
     * 現在の状態をブラウザのローカルストレージに保存します。
     */
    const saveState = () => {
        const appState = {
            matchDate: matchDateInput.value,
            teamWhite: teamNameWhiteInput.value,
            teamBlue: teamNameBlueInput.value,
            records: state.records
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
            state.records = appState.records || [];
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
        playerNumberContainer.addEventListener('click', handleSelection);
        teamColorContainer.addEventListener('click', handleSelection);
        primaryEventContainer.addEventListener('click', handleSelection);
        secondaryEventContainer.addEventListener('click', handleSelection);
        calculatorButtons.addEventListener('click', handleCalculator);
        clearTimeBtn.addEventListener('click', () => { state.timeInput = ""; updateTimeDisplay(); });
        addRecordBtn.addEventListener('click', addRecord);
        exportCsvBtn.addEventListener('click', exportCsv);
        resetAllBtn.addEventListener('click', () => confirmModal.style.display = 'flex');

        // 全記録リセットの確認モーダル
        modalCancelBtn.addEventListener('click', () => confirmModal.style.display = 'none');
        modalConfirmBtn.addEventListener('click', () => {
            state.records = [];
            localStorage.removeItem('waterPoloAppState');
            teamNameWhiteInput.value = '';
            teamNameBlueInput.value = '';
            matchDateInput.value = new Date().toISOString().split('T')[0];
            updateTeamLabels();
            render();
            resetInputs();
            confirmModal.style.display = 'none';
        });

        // 記録一覧の操作（削除・修正）はイベントデリゲーションで処理
        recordList.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('.delete-btn')) {
                deleteRecord(Number(target.dataset.id));
            } else if (target.matches('.edit-btn')) {
                handleEditClick(Number(target.dataset.id));
            }
        });

        // 番号修正モーダルの処理
        editModalSaveBtn.addEventListener('click', () => {
            if (state.recordIdToEdit !== null) {
                const record = state.records.find(r => r.id === state.recordIdToEdit);
                if (record) {
                    record.number = editNumberSelect.value;
                    render();
                    saveState();
                }
            }
            editNumberModal.style.display = 'none';
            state.recordIdToEdit = null;
        });
        editModalCancelBtn.addEventListener('click', () => {
            editNumberModal.style.display = 'none';
            state.recordIdToEdit = null;
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
    const handleSelection = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton || !clickedButton.dataset.value) return;

        const container = clickedButton.closest('.button-group');
        if (!container) return;
        const value = clickedButton.dataset.value;

        // イベントボタンの場合、両方のコンテナから選択状態を解除
        if (container.id.includes('event-buttons')) {
            primaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            secondaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            state.selectedEvent = value;
        } else { // 番号、チームカラーボタンの場合
            container.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            if (container.id === 'player-number-buttons') state.selectedNumber = value;
            if (container.id === 'team-color-buttons') state.selectedColor = value;
        }
        clickedButton.classList.add('selected');
    };

    /**
     * 時間入力電卓のクリックを処理します。
     */
    const handleCalculator = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.value) return;
        if (state.timeInput.length < 4) {
            state.timeInput += button.dataset.value;
            updateTimeDisplay();
        }
    };

    /**
     * 記録一覧の「修」ボタンのクリックを処理します。
     */
    const handleEditClick = (idToEdit) => {
        const record = state.records.find(r => r.id === idToEdit);
        if (record) {
            state.recordIdToEdit = idToEdit;
            // 修正：現在の番号をデフォルトで選択する
            editNumberSelect.value = record.number;
            editNumberModal.style.display = 'flex';
        }
    };

    // --- コアロジック関数 ---
    /**
     * records配列を受け取り、ピリオドやスコアなどの派生データを計算して新しい配列を返します。
     * @param {Array} originalRecords - 元の記録配列
     * @returns {Array} - 計算済みのプロパティが追加された新しい記録配列
     */
    const processRecords = (originalRecords) => {
        const sortedById = [...originalRecords].sort((a, b) => a.id - b.id);
        let periodCounter = 1;
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => event.includes('得点');

        return sortedById.map((record, index) => {
            // 最初のセンターボール以外でピリオドをインクリメント
            if (index > 0 && record.event.includes('センターボール')) {
                periodCounter++;
            }
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            return {
                ...record,
                chronologicalId: String(index + 1).padStart(3, '0'),
                period: periodCounter,
                scoreWhite: runningScoreWhite,
                scoreBlue: runningScoreBlue,
            };
        });
    };

    /**
     * 入力された情報に基づいて新しい記録を追加します。
     */
    const addRecord = () => {
        const timeValue = timeDisplay.value;
        const [minutes, seconds] = timeValue.split(':').map(Number);

        if (seconds >= 60) { alert("秒数は59以下で入力してください。"); timeDisplay.classList.add('error'); return; }
        if (minutes > 8 || (minutes === 8 && seconds > 0)) { alert("エラー: 時間は8:00以内で入力してください。"); timeDisplay.classList.add('error'); return; }

        const numberOptionalEvents = ['TO タイムアウト', 'YC イエローカード', 'RC レッドカード'];
        if (!timeValue || timeValue === "0:00" || !state.selectedColor || !state.selectedEvent) {
            alert("時間、色、イベントは必ず選択してください。");
            return;
        }

        const isNumberRequired = !numberOptionalEvents.some(event => state.selectedEvent.includes(event));
        if (isNumberRequired && !state.selectedNumber) {
            alert("このイベントには選手番号の選択が必要です。（不明な場合は「？」を選択してください）");
            return;
        }

        const newRecord = {
            id: Date.now(),
            time: timeDisplay.value,
            number: state.selectedNumber || '-',
            color: state.selectedColor,
            event: state.selectedEvent,
        };
        state.records.push(newRecord);
        render();
        resetInputs();
        saveState();
    };

    /**
     * 指定されたIDの記録を削除します。
     */
    const deleteRecord = (idToDelete) => {
        state.records = state.records.filter(record => record.id !== idToDelete);
        render();
        saveState();
    };

    // --- UI更新・補助関数 ---
    /**
     * 全ての表示（スコアボード、記録一覧、退水管理表）を最新の状態に更新するメイン関数です。
     */
    const render = () => {
        // Step 1: 記録データにピリオドやスコアを計算して追加 (副作用なし)
        const processedRecords = processRecords(state.records);

        // Step 2: スコアボードを更新
        const lastRecord = processedRecords[processedRecords.length - 1];
        periodDisplay.textContent = lastRecord ? lastRecord.period : 1;
        scoreWhiteDisplay.textContent = lastRecord ? lastRecord.scoreWhite : 0;
        scoreBlueDisplay.textContent = lastRecord ? lastRecord.scoreBlue : 0;

        // Step 3: 表示用に、記録を「ピリオド降順」「時間昇順」にソート
        const displayRecords = [...processedRecords].sort((a, b) => {
            if (a.period !== b.period) return b.period - a.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t) => 60 * acc + Number(t), 0);
            return timeToSec(a.time) - timeToSec(b.time);
        });

        // Step 4: 記録一覧を描画
        recordList.innerHTML = "";
        displayRecords.forEach(record => {
            const eventShort = record.event.split(' ')[0];
            const row = document.createElement('tr');
            const actionButtonsHTML = (record.number === '?')
                ? `<button class="edit-btn" data-id="${record.id}">修</button>`
                : `<button class="delete-btn" data-id="${record.id}">×</button>`;

            row.innerHTML = `
                <td>${record.chronologicalId}</td>
                <td>${record.period}</td>
                <td>${record.time}</td>
                <td>${record.number}</td>
                <td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td>
                <td>${eventShort}</td>
                <td>${record.scoreWhite}</td>
                <td>${record.scoreBlue}</td>
                <td class="actions-cell">${actionButtonsHTML}</td>`;
            recordList.appendChild(row);
        });

        // Step 5: 退水管理テーブルを更新 (計算済みデータを渡す)
        renderExclusionTable(processedRecords);
    };

    /**
     * 退水管理テーブルを再描画します。
     */
    const renderExclusionTable = (processedRecords) => {
        const tableCells = document.querySelectorAll('#exclusion-table tbody td');
        tableCells.forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('excluded');
        });

        const foulEvents = ['E ', 'P ', 'SR ', 'SV '];
        const exclusionRecords = processedRecords.filter(r =>
            r.number && foulEvents.some(event => r.event.startsWith(event))
        );

        const foulCounts = {};

        exclusionRecords.forEach(record => {
            const key = `${record.color}-${record.number}`;
            if (!foulCounts[key]) {
                foulCounts[key] = { count: 0, hasSV: false, entries: [] };
            }

            const eventCode = record.event.split(' ')[0].replace('EG', 'E').replace('PG', 'P');
            const entryText = `${eventCode}${record.period} ${record.time}`;
            foulCounts[key].entries.push(entryText);
            foulCounts[key].count++;
            if (record.event.startsWith('SV ')) {
                foulCounts[key].hasSV = true;
            }
        });

        for (const key in foulCounts) {
            const [color, number] = key.split('-');
            const cellId = `fouls-${color === '白' ? 'white' : 'blue'}-${number}`;
            const cell = document.getElementById(cellId);
            if (cell) {
                // 新しい順に表示するために逆順にする
                cell.innerHTML = foulCounts[key].entries.reverse().join('<br>');
                if (foulCounts[key].count >= 3 || foulCounts[key].hasSV) {
                    cell.classList.add('excluded');
                }
            }
        }
    };

    /**
     * 入力フォームとボタンの選択状態をリセットします。
     */
    const resetInputs = () => {
        state.timeInput = "";
        updateTimeDisplay();
        document.querySelectorAll('.button-group button.selected').forEach(btn => btn.classList.remove('selected'));
        state.selectedNumber = null;
        state.selectedColor = null;
        state.selectedEvent = null;
    };

    /**
     * 記録をCSV形式でダウンロードします。
     */
    const exportCsv = () => {
        if (state.records.length === 0) { alert("エクスポートする記録がありません。"); return; }
        const matchDate = matchDateInput.value;
        if (!matchDate) { alert("試合の日付を入力してください。"); return; }

        const teamWhite = teamNameWhiteInput.value.trim() || '白';
        const teamBlue = teamNameBlueInput.value.trim() || '青';
        const sanitizedWhite = teamWhite.replace(/[\s\\/:*?"<>|]/g, '_');
        const sanitizedBlue = teamBlue.replace(/[\s\\/:*?"<>|]/g, '_');
        const filename = `waterpolo_record_${matchDate}_${sanitizedWhite}_vs_${sanitizedBlue}.csv`;

        let csvContent = `試合日,${matchDate}\n`;
        csvContent += `チーム(白),${teamWhite}\n`;
        csvContent += `チーム(青),${teamBlue}\n\n`;
        csvContent += "No,ピリオド,時間,番号,色,イベント,得点(白),得点(青)\n";

        // ロジックを共通化: processRecordsを使い、CSV用のソートを適用
        const processedRecords = processRecords(state.records);
        const sortedForCsv = [...processedRecords].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t) => 60 * acc + Number(t), 0);
            return timeToSec(b.time) - timeToSec(a.time); // 時間は降順
        });

        sortedForCsv.forEach(record => {
            const eventShort = record.event.split(' ')[0];
            const row = [record.chronologicalId, record.period, record.time, record.number, record.color, eventShort, record.scoreWhite, record.scoreBlue].join(',');
            csvContent += row + "\n";
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
        const len = state.timeInput.length;

        if (len === 1) {
            formattedTime = `0:0${state.timeInput}`;
        } else if (len === 2) {
            formattedTime = `0:${state.timeInput}`;
        } else if (len === 3) {
            formattedTime = `${state.timeInput[0]}:${state.timeInput.slice(1)}`;
        } else if (len === 4) {
            // 修正: 4桁入力時のフォーマット (例: 1234 -> 12:34 ではなく、800 より大きい時間を考慮)
            const minutes = parseInt(state.timeInput.slice(0, 1), 10);
            const seconds = parseInt(state.timeInput.slice(1, 3), 10); // 例 759 -> 7:59
            // このロジックは3桁までの入力を想定しているため、4桁目は実質的に8分以上のチェック
            if (minutes > 8 || (minutes === 8 && seconds > 0)) {
                // 不正な場合は最後の入力を無効にする
                state.timeInput = state.timeInput.slice(0, 3);
                formattedTime = `${state.timeInput[0]}:${state.timeInput.slice(1)}`;
            } else {
                 // 4桁目が入力されても、3桁として扱う (例: 7590 -> 7:59)
                const validTime = state.timeInput.slice(0, 3);
                formattedTime = `${validTime[0]}:${validTime.slice(1)}`;
            }
        }
        timeDisplay.value = formattedTime;
    };

    // --- アプリケーションの実行開始 ---
    initializeApp();
});