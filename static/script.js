document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const periodDisplay = document.getElementById('period-display');
    const scoreWhiteDisplay = document.getElementById('score-white');
    const scoreBlueDisplay = document.getElementById('score-blue');
    const timeDisplay = document.getElementById('time-display');
    const calculatorButtons = document.querySelector('.calculator-buttons');
    const clearTimeBtn = document.getElementById('clear-time-btn');
    const playerNumberSelect = document.getElementById('player-number');
    const teamColorSelect = document.getElementById('team-color');
    const eventTypeSelect = document.getElementById('event-type');
    const addRecordBtn = document.getElementById('add-record-btn');
    const recordList = document.getElementById('record-list');
    const exportCsvBtn = document.getElementById('export-csv-btn');

    // アプリケーションの状態を管理する変数
    let period = 0;
    let timeInput = "";
    let records = []; // 記録データを格納する配列

    /**
     * 時間入力電卓のボタンがクリックされたときの処理
     */
    calculatorButtons.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;

        const value = e.target.dataset.value;
        if (timeInput.length < 4) {
            timeInput += value;
            update_time_display();
        }
    });

    /**
     * 時間クリアボタンの処理
     */
    clearTimeBtn.addEventListener('click', () => {
        timeInput = "";
        update_time_display();
    });

    /**
     * 時間表示をフォーマットして更新する関数
     */
    const update_time_display = () => {
        let formattedTime = "0:00";
        if (timeInput.length === 1) {
            formattedTime = `0:0${timeInput}`;
        } else if (timeInput.length === 2) {
            formattedTime = `0:${timeInput}`;
        } else if (timeInput.length === 3) {
            formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        } else if (timeInput.length === 4) {
            const minutes = parseInt(timeInput.slice(0, 2), 10);
            if (minutes < 10) { // 例: 0800 -> 8:00
                 formattedTime = `${parseInt(timeInput.slice(0,2), 10)}:${timeInput.slice(2)}`;
            } else { // 10分以上は不正入力として扱いにくいので先頭1文字
                 formattedTime = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`;
            }
        }
        timeDisplay.value = formattedTime;
    };


    /**
     * 「記録を追加」ボタンの処理
     */
    addRecordBtn.addEventListener('click', () => {
        if (timeInput === "" || playerNumberSelect.value === "" || teamColorSelect.value === "" || eventTypeSelect.value === "") {
            alert("時間を入力してください。");
            return;
        }

        let scoreWhite = 0;
        let scoreBlue = 0;
        records.forEach(r => {
            if (r.event === '得点') {
                if (r.color === '白') scoreWhite++;
                else scoreBlue++;
            }
        });
        // 今追加するイベントが「得点」の場合、スコアを先に加算しておく
        if (eventTypeSelect.value === '得点') {
            if (teamColorSelect.value === '白') scoreWhite++;
            else scoreBlue++;
        }
        const currentScore = `${scoreWhite}-${scoreBlue}`;
        
        const newRecord = {
            id: Date.now(), // 削除用にユニークなIDを付与
            period: (eventTypeSelect.value === 'センターボール') ? period + 1 : period,
            time: timeDisplay.value,
            number: playerNumberSelect.value,
            color: teamColorSelect.value,
            event: eventTypeSelect.value,
            score: currentScore,
        };
        
        // イベントが「センターボール」の場合、ピリオドをインクリメントして表示を更新
        if (newRecord.event === 'センターボール') {
            period++;
            periodDisplay.textContent = period;
        }
        
        records.push(newRecord);
        render_records();

        // 入力フォームをリセット
        timeInput = "";
        update_time_display();

        playerNumberSelect.selectedIndex = 0;
        teamColorSelect.selectedIndex = 0;
        eventTypeSelect.selectedIndex = 0;
    });

    /**
     * 記録リストを再描画し、スコアを更新する関数
     */
    const render_records = () => {
        recordList.innerHTML = ""; // 一旦リストを空にする
        let scoreWhite = 0;
        let scoreBlue = 0;

        records.forEach(record => {
            // スコア計算
            if (record.event === '得点') {
                if (record.color === '白') {
                    scoreWhite++;
                } else {
                    scoreBlue++;
                }
            }

            // テーブルに行を追加
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.period}</td>
                <td>${record.time}</td>
                <td>${record.number}</td>
                <td class="${record.color === '白' ? 'white-cell' : 'blue-cell'}">${record.color}</td>
                <td>${record.event}</td>
                <td>${record.score}</td>
                <td><button class="delete-btn" data-id="${record.id}">×</button></td>
            `;
            recordList.appendChild(row);
        });

        // スコア表示を更新
        scoreWhiteDisplay.textContent = scoreWhite;
        scoreBlueDisplay.textContent = scoreBlue;

        // 削除ボタンにイベントリスナーを追加
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', delete_record);
        });
    };

    /**
     * 特定の記録を削除する関数
     */
    const delete_record = (e) => {
        const id_to_delete = Number(e.target.dataset.id);
        const recordToDelete = records.find(record => record.id === id_to_delete);
        if (recordToDelete && recordToDelete.event === 'センターボール') {
            period--;
            periodDisplay.textContent = period;
        }
        records = records.filter(record => record.id !== id_to_delete);
        render_records();
    };


    /**
     * 記録データをCSV形式でエクスポートする関数
     */
    exportCsvBtn.addEventListener('click', () => {
        if (records.length === 0) {
            alert("エクスポートする記録がありません。");
            return;
        }

        // CSVのヘッダー行
        let csvContent = "ピリオド,時間,番号,色,イベント,得点\n";

        // 各記録をCSVの行に変換
        records.forEach(record => {
            const row = [record.period, record.time, record.number, record.color, record.event].join(',');
            csvContent += row + "\n";
        });

        // BOMを付与してExcelでの文字化けを防ぐ
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // ファイル名を生成
        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
        a.download = `waterpolo_record_${timestamp}.csv`;

        a.click();
        URL.revokeObjectURL(url);
    });
});
