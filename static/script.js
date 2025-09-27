/**
 * 水球スコア記録アプリのメインスクリプト
 * DOMの読み込みが完了した時点で初期化処理を実行します。
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- グローバル変数・定数定義 ---

    // HTMLから操作対象となる要素を取得
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

    // アプリケーションの状態を管理する変数
    // let period = 0; // ★修正: period変数は記録から都度計算するため、グローバル変数としては不要
    let timeInput = "";
    let records = [];
    let selectedNumber = null;
    let selectedColor = null;
    let selectedEvent = null;

    /**
     * 現在の記録をローカルストレージに保存する
     */
    const saveRecords = () => {
        const appState = {
            matchDate: matchDateInput.value,
            teamWhite: teamNameWhiteInput.value,
            teamBlue: teamNameBlueInput.value,
            records: records
        };
        localStorage.setItem('waterPoloAppState', JSON.stringify(appState));
    };

    /**
     * ローカルストレージから記録を読み込む
     */
    const loadRecords = () => {
        const savedState = localStorage.getItem('waterPoloAppState');
        if (savedState) {
            const appState = JSON.parse(savedState);
            records = appState.records || [];
            matchDateInput.value = appState.matchDate || new Date().toISOString().split('T')[0];
            teamNameWhiteInput.value = appState.teamWhite || '';
            teamNameBlueInput.value = appState.teamBlue || '';
            updateTeamLabels();
            renderRecords();
        } else {
            matchDateInput.value = new Date().toISOString().split('T')[0];
        }
    };

    // --- 初期化処理 ---
    const initializeApp = () => {
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
        recordList.addEventListener('click', handleRecordClick);

        resetAllBtn.addEventListener('click', () => {
            if (confirm("本当にすべての記録をリセットしますか？この操作は元に戻せません。")) {
                records = [];
                // period = 0; // ★修正: グローバル変数ではないので不要
                localStorage.removeItem('waterPoloAppState');
                teamNameWhiteInput.value = '';
                teamNameBlueInput.value = '';
                matchDateInput.value = new Date().toISOString().split('T')[0];
                updateTeamLabels();
                renderRecords(); // これでスコアとピリオドも0になる
                resetInputs();
            }
        });

        loadRecords();
    };



    // --- イベントハンドラ関数 ---

    /**
     * ボタンクリックの共通処理
     */
    const handleButtonClick = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton) return;

        const container = clickedButton.closest('.button-group');
        if (!container) return; 

        const value = clickedButton.dataset.value;
        const currentSelected = container.querySelector('button.selected');

        // 同じボタンが再度クリックされた場合は選択を解除
        if (clickedButton === currentSelected) {
            clickedButton.classList.remove('selected');
            if (container.id === 'player-number-buttons') selectedNumber = null;
            if (container.id === 'team-color-buttons') selectedColor = null;
            if (container.id === 'primary-event-buttons' || container.id === 'secondary-event-buttons') selectedEvent = null;
            return;
        }

        // イベントボタンの場合
        if (container.id === 'primary-event-buttons' || container.id === 'secondary-event-buttons') {
            primaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            secondaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            selectedEvent = value;
        } 
        // 番号・色ボタンの場合
        else {
            if(currentSelected) currentSelected.classList.remove('selected');
            if (container.id === 'player-number-buttons') selectedNumber = value;
            if (container.id === 'team-color-buttons') selectedColor = value;
        }

        clickedButton.classList.add('selected');
    };

    /**
     * 時間入力電卓の処理
     */
    const handleCalculator = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.value) return;
        if (timeInput.length < 4) {
            timeInput += button.dataset.value;
            updateTimeDisplay();
        }
    };

    // --- コアロジック関数 ---

    /**
     * ★★★修正点★★★
     * 現在のピリオドを記録から計算する関数
     * @returns {number} 現在のピリオド
     */
    const calculateCurrentPeriod = () => {
        // records配列の中から "センターボール" イベントの数を数える
        return records.filter(record => record.event.includes('センターボール')).length;
    };


    /**
     * 「記録を追加」ボタンの処理
     */
    const addRecord = () => {
        const timeValue = timeDisplay.value;
        const [minutes, seconds] = timeValue.split(':').map(Number);
        timeDisplay.classList.remove('error');

        if (seconds >= 60) {
            alert("秒数は59以下で入力してください。");
            timeDisplay.classList.add('error');
            return;
        }
        if (minutes > 8 || (minutes === 8 && seconds > 0)) {
            alert("エラー: 時間は8:00以内で入力してください。");
            timeDisplay.classList.add('error');
            return;
        }
        const numberOptionalEvents = ['TO タイムアウト', 'YC イエローカード', 'RC レッドカード'];
        const isNumberRequired = selectedEvent && !numberOptionalEvents.includes(selectedEvent);

        // 必須項目チェック
        if (!timeValue || timeValue === "0:00" || !selectedNumber || !selectedColor || !selectedEvent) {
            alert("時間、番号（不明な場合は「？」）、色、イベントをすべて選択してください。");
            return;
        }
        // 番号が必須のイベントで、番号が選択されていない場合
        if (isNumberRequired && !selectedNumber) {
            alert("このイベントには選手番号の選択が必要です。");
            return;
        }        
        // ★修正: ピリオドは追加時に直接インクリメントせず、計算関数から取得する
        const currentPeriod = calculateCurrentPeriod();
        const newRecordPeriod = selectedEvent.includes('センターボール') ? currentPeriod + 1 : currentPeriod;

        // ピリオド0での「センターボール」以外のイベント追加を禁止
        if (newRecordPeriod === 0 && !selectedEvent.includes('センターボール')) {
            alert("最初のイベントは「# センターボール」を選択してください。");
            return;
        }

        const newRecord = {
            id: Date.now(),
            period: newRecordPeriod,
            time: timeDisplay.value,
            number: selectedNumber,
            color: selectedColor,
            event: selectedEvent,
        };

        records.push(newRecord);
        renderRecords(); // 再描画（ここでピリオドとスコアが更新される）
        resetInputs();
        saveRecords();
    };

    /**
     * 記録一覧の行がクリックされたときの処理
     */
    const handleRecordClick = (e) => {
        // 【1. ガード処理】 削除ボタンが押されたら、編集処理はしない
        if (e.target.classList.contains('delete-btn')) {
            return;
        }

        // 【2. クリックされた行の特定】
        // クリックされた場所から一番近い <tr> (テーブルの行) を探す
        const row = e.target.closest('tr');
        // 行が見つからない、または行に記録IDがなければ処理を中断
        if (!row || !row.dataset.id) return;

        // 【3. 編集対象の記録データを取得】
        // 行に埋め込まれたIDを使って、全記録データ(records)の中から該当のものを探し出す
        const recordId = Number(row.dataset.id);
        const record = records.find(r => r.id === recordId);

        // 【4. 編集可能かチェック】
        // 探し出した記録の選手番号が「？」でなければ、編集する必要がないので処理を中断
        if (!record || record.number !== '?') {
            return;
        }

        // 【5. ユーザーに新しい番号を入力してもらう】
        // promptという小さな入力ウィンドウを表示して、新しい番号の入力を促す
        const newNumberStr = prompt("この記録の正しい選手番号を入力してください（1-15）：", "");

        // 【6. 入力内容のチェック (1)】
        // 入力がキャンセルされたり、空欄だった場合は処理を中断
        if (newNumberStr === null || newNumberStr.trim() === "") {
            return;
        }

        // 【7. 入力内容のチェック (2)】
        // 入力された文字を、計算可能な「数値」に変換する
        const newNumber = parseInt(newNumberStr, 10);
        // 数値でない、または1～15の範囲外の場合はエラーメッセージを表示して処理を中断
        if (isNaN(newNumber) || newNumber < 1 || newNumber > 15) {
            alert("エラー: 1から15までの半角数字で入力してください。");
            return;
        }

        // 【8. 記録データの更新】
        // すべてのチェックを通過したら、記録の番号を新しい番号に書き換える
        record.number = newNumber.toString();

        // 【9. 画面の再描画と保存】
        // 変更を画面に反映させるために、記録一覧と退水管理表を再描画する
        renderRecords();
        // 変更をブラウザに保存して、次回開いたときもデータが残るようにする
        saveRecords();
    };
    
    /**
     * 記録を削除する
     */
    const deleteRecord = (e) => {
        const idToDelete = Number(e.target.dataset.id);
        records = records.filter(record => record.id !== idToDelete);

        // ★修正: 記録削除後、ピリオドがずれる可能性があるため、後の記録のピリオドを再計算して修正
        const centerBallRecords = records
            .filter(r => r.event.includes('センターボール'))
            .sort((a, b) => a.id - b.id); // 古い順に並べる

        records.forEach(record => {
            // その記録がどのセンターボールの後に起きたかを判定
            let periodForRecord = 0;
            for (let i = 0; i < centerBallRecords.length; i++) {
                if (record.id >= centerBallRecords[i].id) {
                    periodForRecord = i + 1;
                }
            }
            record.period = periodForRecord;
        });

        renderRecords();
        saveRecords();
    };

    /**
     * CSV出処理
     */
    const exportCsv = () => {
        if (records.length === 0) {
            alert("エクスポートする記録がありません。");
            return;
        }
        const matchDate = matchDateInput.value;
        const teamWhite = teamNameWhiteInput.value.trim() || 'チーム白';
        const teamBlue = teamNameBlueInput.value.trim() || 'チーム青';
        if (!matchDate) {
            alert("試合の日付を入力してください。");
            return;
        }

        const sanitizedWhite = teamWhite.replace(/[\s\\/:*?"<>|]/g, '_');
        const sanitizedBlue = teamBlue.replace(/[\s\\/:*?"<>|]/g, '_');
        const filename = `waterpolo_record_${matchDate}_${sanitizedWhite}_vs_${sanitizedBlue}.csv`;

        // ★修正: isGoalEventはそのまま流用し、出力時のイベント名を短縮
        let csvContent = "No,ピリオド,時間,番号,色,イベント,得点白,得点青\n";
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => event.includes('得点');

        const sortedRecords = [...records].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeA = a.time.split(':').map(Number).reduce((acc, t) => 60 * acc + t, 0);
            const timeB = b.time.split(':').map(Number).reduce((acc, t) => 60 * acc + t, 0);
            return timeB - timeA;
        });

        sortedRecords.forEach((record, index) => {
            // イベント名の「G」「EG」などを抽出
            const eventShort = record.event.split(' ')[0];
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const row = [index + 1, record.period, record.time, record.number, record.color, eventShort, runningScoreWhite, runningScoreBlue].join(',');
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

    // --- UI更新・補助関数 ---

    /**
     * チーム名表示を更新
     */
    const updateTeamLabels = () => {
        const whiteName = teamNameWhiteInput.value.trim();
        const blueName = teamNameBlueInput.value.trim();
        teamLabelWhite.textContent = whiteName || '白';
        teamLabelBlue.textContent = blueName || '青';
    };

    /**
     * 退水管理テーブルを記録データに基づいて再描画する
     */
    const renderExclusionTable = () => {
        // 1. テーブルの全セルを一旦クリアする
        document.querySelectorAll('#exclusion-table-body td').forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('excluded');
        });

        // 2. 記録の中から、個人のファウルとなるイベントのみを抽出する
        const exclusionRecords = records.filter(record =>
            record.event.includes('退水') || record.event.includes('ペナルティ') || record.event.includes('乱暴行為')
        );

        // 3. 選手ごとにファウル情報をまとめる
        const foulsByPlayer = {}; // 例: {'white-5': ['E1 5:30', 'P2 2:10']}
        exclusionRecords.forEach(record => {
            const color = record.color === '白' ? 'white' : 'blue';
            const playerKey = `${color}-${record.number}`;
            if (!foulsByPlayer[playerKey]) {
                foulsByPlayer[playerKey] = [];
            }

            // 4. イベント内容に応じて表示用のコード(E, P, SV)を決定する
            let eventCode;
            if (record.event.includes('ペナルティ')) {
                eventCode = 'P';
            } else if (record.event.includes('乱暴行為')) {
                eventCode = 'SV';
            } else { // '退水', '退水得点', '残り時間退水' はすべて 'E' として扱う
                eventCode = 'E';
            }

            // 5. 指定されたフォーマットの文字列を作成して追加する
            const foulString = `${eventCode}${record.period} ${record.time}`;
            foulsByPlayer[playerKey].push(foulString);
        });

        // 6. まとめたファウル情報をテーブルの各セルに描画する
        for (const playerKey in foulsByPlayer) {
            const [color, number] = playerKey.split('-');
            const cell = document.getElementById(`fouls-${color}-${number}`);
            if (cell) {
                // ファウル情報を改行で区切って表示
                cell.innerHTML = foulsByPlayer[playerKey].join('<br>');

                // ファウルが3回以上、またはSV（乱暴行為）が含まれる場合はセルを赤くする
                if (foulsByPlayer[playerKey].length >= 3 || foulsByPlayer[playerKey].some(foul => foul.startsWith('SV'))) {
                    cell.classList.add('excluded');
                }
            }
        }
    };

    /**
     * 記録一覧テーブルとスコアボードを再描画する
     */
    const renderRecords = () => {
        recordList.innerHTML = "";
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;

        // ★★★修正点★★★
        // イベント名に '得点' という文字が含まれているかで判定するように変更
        const isGoalEvent = (event) => event.includes('得点');

        // 表示前にソート
        records.sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t, i) => acc + parseInt(t) * (i === 0 ? 60 : 1), 0);
            if (timeToSec(a.time) !== timeToSec(b.time)) return timeToSec(b.time) - timeToSec(a.time);
            return a.id - b.id; // 同じ時間の場合は追加された順
        });

        records.forEach((record, index) => {
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const row = document.createElement('tr');
            // イベント名はスペースより前（G, EGなど）を表示
            const eventShort = record.event.split(' ')[0];
            // 番号が「？」の行に 'unknown-number' クラスを付与
            if (record.number === '?') {
                row.classList.add('unknown-number');
            }
            // 各行に、その行の記録IDをデータとして埋め込む
            row.dataset.id = record.id;
            row.innerHTML = `<td>${index + 1}</td><td>${record.period}</td><td>${record.time}</td><td>${record.number || '-'}</td><td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td><td>${eventShort}</td><td>${runningScoreWhite}</td><td>${runningScoreBlue}</td><td><button class="delete-btn" data-id="${record.id}">×</button></td>`;
            // ...
            recordList.appendChild(row);
        });

        scoreWhiteDisplay.textContent = runningScoreWhite;
        scoreBlueDisplay.textContent = runningScoreBlue;

        // ★★★修正点★★★
        // ピリオドはグローバル変数ではなく、記録から再計算して表示
        const currentPeriod = calculateCurrentPeriod();
        periodDisplay.textContent = currentPeriod;
        
        renderExclusionTable();

        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
    };

    /**
     * 入力フォームをリセット
     */
    const resetInputs = () => {
        timeInput = "";
        updateTimeDisplay();
        timeDisplay.classList.remove('error');
        document.querySelectorAll('.button-group button.selected').forEach(btn => btn.classList.remove('selected'));
        selectedNumber = null;
        selectedColor = null;
        selectedEvent = null;
    };

    /**
     * 時間表示を更新
     */
    const updateTimeDisplay = () => {
        let formattedTime = "0:00";
        if (timeInput.length === 1) formattedTime = `0:0${timeInput}`;
        else if (timeInput.length === 2) formattedTime = `0:${timeInput}`;
        else if (timeInput.length === 3) formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) {
             const minutes = parseInt(timeInput.slice(0, 2), 10);
            // 8分以上の入力を制限（例：9000と入力されて90:00になるのを防ぐ）
            if (parseInt(timeInput.slice(0,1), 10) > 8) {
                 formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`;
            } else {
                 formattedTime = `${timeInput.slice(0, 2)}:${timeInput.slice(2,4)}`;
            }
        }
        timeDisplay.value = formattedTime;
    };

    initializeApp();
});