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

    // アプリケーションの状態を管理する変数
    let period = 0;              // 現在のピリオド
    let timeInput = "";          // 時間入力用の一時的な文字列
    let records = [];            // 全ての記録を保持する配列
    let selectedNumber = null;   // 選択中の選手番号
    let selectedColor = null;    // 選択中のチーム色
    let selectedEvent = null;    // 選択中のイベント

    // --- 初期化処理 ---

    /**
     * アプリケーションを初期化し、イベントリスナーを設定します。
     */
    const initializeApp = () => {
        // 試合日の初期値を今日に設定
        const today = new Date().toISOString().split('T')[0];
        matchDateInput.value = today;

        // 各要素にイベントリスナーを登録
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

    // --- イベントハンドラ関数 ---

    /**
     * 番号・色・イベントのボタンがクリックされた際の共通処理
     * @param {Event} e - クリックイベントオブジェクト
     */
    const handleButtonClick = (e) => {
        const clickedButton = e.target.closest('button');
        if (!clickedButton) return;

        const container = clickedButton.closest('.button-group');
        if (!container) return; 

        const value = clickedButton.dataset.value;

        // イベントボタンの場合：主要・その他の両方から選択を解除
        if (container.id === 'primary-event-buttons' || container.id === 'secondary-event-buttons') {
            primaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            secondaryEventContainer.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            selectedEvent = value;
        } 
        // 番号・色ボタンの場合：同じグループ内からのみ選択を解除
        else {
            container.querySelectorAll('button.selected').forEach(btn => btn.classList.remove('selected'));
            if (container.id === 'player-number-buttons') selectedNumber = value;
            if (container.id === 'team-color-buttons') selectedColor = value;
        }

        clickedButton.classList.add('selected');
    };

    /**
     * 時間入力電卓のボタンがクリックされた際の処理
     * @param {Event} e - クリックイベントオブジェクト
     */
    const handleCalculator = (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.value) return; // データ属性がないボタン(Cボタンなど)は無視
        if (timeInput.length < 4) {
            timeInput += button.dataset.value;
            updateTimeDisplay();
        }
    };

    // --- コアロジック関数 ---

    /**
     * 「記録を追加」ボタンが押された際の処理
     */
    const addRecord = () => {
        const timeValue = timeDisplay.value;
        const [minutes, seconds] = timeValue.split(':').map(Number);

        if (seconds >= 60) {
            alert("秒数は59以下で入力してください。");
            timeDisplay.classList.add('error'); // エラー表示を有効化
            return; // 処理を中断
        }

        if (minutes > 8 || (minutes === 8 && seconds > 0)) {
            alert("エラー: 時間は8:00以内で入力してください。");
            timeDisplay.classList.add('error');
            return;
        }
        
        if (timeInput === "" || !selectedNumber || !selectedColor || !selectedEvent) {
            alert("時間とすべての項目を選択してください。");
            return;
        }

        const newRecord = {
            id: Date.now(),
            period: (selectedEvent === 'センターボール') ? period + 1 : period,
            time: timeDisplay.value,
            number: selectedNumber,
            color: selectedColor,
            event: selectedEvent,
        };

        if (newRecord.event === 'センターボール') {
            period++;
        }
        records.push(newRecord);
        renderRecords();
        resetInputs();
    };

    /**
     * 削除ボタンが押された際に、指定された記録を削除する
     * @param {Event} e - クリックイベントオブジェクト
     */
    const deleteRecord = (e) => {
        const idToDelete = Number(e.target.dataset.id);
        const recordToDelete = records.find(record => record.id === idToDelete);

        // 削除する記録がセンターボールの場合、ピリオドをデクリメント
        if (recordToDelete && recordToDelete.event === 'センターボール') {
            period--;
        }
        records = records.filter(record => record.id !== idToDelete);
        renderRecords();
    };

    /**
     * 「CSVで出力」ボタンが押された際に、記録をCSV形式でダウンロードする
     */
    const exportCsv = () => {
        if (records.length === 0) {
            alert("エクスポートする記録がありません。");
            return;
        }

        const matchDate = matchDateInput.value;
        const teamWhite = teamNameWhiteInput.value.trim();
        const teamBlue = teamNameBlueInput.value.trim();
        if (!matchDate || !teamWhite || !teamBlue) {
            alert("試合の日付と両チーム名を入力してください。");
            return;
        }

        // ファイル名に使えない文字をアンダースコアに置換
        const sanitizedWhite = teamWhite.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '_');
        const sanitizedBlue = teamBlue.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '_');
        const filename = `waterpolo_record_${matchDate}_${sanitizedWhite}_vs_${sanitizedBlue}.csv`;

        let csvContent = "No,ピリオド,時間,番号,色,イベント,得点(白),得点(青)\n";
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => ['得点', 'ペナルティ得点', '退水得点'].includes(event);

        // CSV生成前に、表示と同じ順序になるようにソート
        const sortedRecords = [...records].sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeA = a.time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            const timeB = b.time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return timeB - timeA;
        });

        sortedRecords.forEach((record, index) => {
            const recordId = String(index + 1).padStart(3, '0'); // "001", "002", ...
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const row = [recordId, record.period, record.time, record.number, record.color, record.event, runningScoreWhite, runningScoreBlue].join(',');
            csvContent += row + "\n";
        });

        // BOMを付与して文字化けを防ぎ、ファイルをダウンロード
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
     * スコアボードのチーム名表示を更新する
     */
    const updateTeamLabels = () => {
        const whiteName = teamNameWhiteInput.value.trim();
        const blueName = teamNameBlueInput.value.trim();
        teamLabelWhite.textContent = whiteName ? `白 (${whiteName})` : '白';
        teamLabelBlue.textContent = blueName ? `青 (${blueName})` : '青';
    };

    /**
     * 記録一覧テーブルとスコアボードを最新の状態に再描画する
     */
    const renderRecords = () => {
        recordList.innerHTML = "";
        let runningScoreWhite = 0;
        let runningScoreBlue = 0;
        const isGoalEvent = (event) => ['得点', 'ペナルティ得点', '退水得点'].includes(event);

        // 表示前に必ずピリオドと時間でソート
        records.sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const timeToSec = (time) => time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return timeToSec(b.time) - timeToSec(a.time);
        });

        records.forEach((record, index) => {
            const recordId = String(index + 1).padStart(3, '0'); // "001", "002", ...
            if (isGoalEvent(record.event)) {
                if (record.color === '白') runningScoreWhite++;
                else runningScoreBlue++;
            }
            const row = document.createElement('tr');
            row.innerHTML = `<td>${recordId}</td><td>${record.period}</td><td>${record.time}</td><td>${record.number}</td><td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td><td>${record.event}</td><td>${runningScoreWhite}</td><td>${runningScoreBlue}</td><td><button class="delete-btn" data-id="${record.id}">×</button></td>`;
            recordList.appendChild(row);
        });

        // 最終スコアをスコアボードに反映
        scoreWhiteDisplay.textContent = runningScoreWhite;
        scoreBlueDisplay.textContent = runningScoreBlue;
        periodDisplay.textContent = period;

        // 描画後に削除ボタンのイベントリスナーを再設定
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
    };

    /**
     * 入力フォームとボタンの選択状態をリセットする
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
     * 時間表示ディスプレイをフォーマットして更新する
     */
    const updateTimeDisplay = () => {
        let formattedTime = "0:00";
        if (timeInput.length === 1) formattedTime = `0:0${timeInput}`;
        else if (timeInput.length === 2) formattedTime = `0:${timeInput}`;
        else if (timeInput.length === 3) formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) {
            const minutes = parseInt(timeInput.slice(0, 2), 10);
            if (minutes < 10) formattedTime = `${minutes}:${timeInput.slice(2)}`;
            else formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`;
        }
        timeDisplay.value = formattedTime;
    };

    // --- アプリケーションの実行開始 ---
    initializeApp();
});

