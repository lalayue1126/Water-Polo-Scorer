document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
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
    const eventTypeContainer = document.getElementById('event-type-buttons');

    // App state variables
    let period = 0;
    let timeInput = "";
    let records = [];
    let selectedNumber = null;
    let selectedColor = null;
    let selectedEvent = null;

    /**
     * Initializes the application by creating event buttons and setting up event listeners.
     */
    const initializeButtons = () => {
        // Event buttons are generated dynamically based on this array.
        const events = [
            { display: 'センターボール', value: 'センターボール' },
            { display: 'G 得点', value: '得点' },
            { display: 'E 退水', value: '退水' },
            { display: 'EG 退水得点', value: '退水得点' },
            { display: 'P ペナルティ', value: 'ペナルティファール' },
            { display: 'PG ペナルティ得点', value: 'ペナルティ得点' },
            { display: 'X PSOミス', value: 'PSOミス' },
            { display: 'SR 残り時間退水', value: '残り時間退水' },
            { display: 'SV 乱暴行為', value: '乱暴行為' },
            { display: 'TO タイムアウト', value: 'タイムアウト' },
            { display: 'YC イエローカード', value: 'イエローカード' },
            { display: 'RC レッドカード', value: 'レッドカード' },
        ];

        events.forEach(event => {
            const btn = document.createElement('button');
            btn.textContent = event.display;
            btn.dataset.value = event.value;
            eventTypeContainer.appendChild(btn);
        });

        // Set up a single event listener for each button group.
        playerNumberContainer.addEventListener('click', handleButtonClick);
        teamColorContainer.addEventListener('click', handleButtonClick);
        eventTypeContainer.addEventListener('click', handleButtonClick);
    };

    /**
     * Handles clicks on any of the selection buttons (number, color, event).
     * @param {Event} e - The click event.
     */
    const handleButtonClick = (e) => {
        const clickedButton = e.target;
        if (clickedButton.tagName !== 'BUTTON') return;

        const container = clickedButton.closest('.button-group');
        if (!container) return;

        // Deselect any previously selected button in the same group.
        container.querySelectorAll('button.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select the clicked button.
        clickedButton.classList.add('selected');

        // Update the corresponding state variable.
        const value = clickedButton.dataset.value;
        if (container.id === 'player-number-buttons') selectedNumber = value;
        if (container.id === 'team-color-buttons') selectedColor = value;
        if (container.id === 'event-type-buttons') selectedEvent = value;
    };

    // --- Time Input Calculator ---
    calculatorButtons.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        const value = e.target.dataset.value;
        if (timeInput.length < 4) { timeInput += value; updateTimeDisplay(); }
    });
    clearTimeBtn.addEventListener('click', () => { timeInput = ""; updateTimeDisplay(); });

    const updateTimeDisplay = () => {
        let ft = "0:00";
        if (timeInput.length === 1) ft = `0:0${timeInput}`;
        else if (timeInput.length === 2) ft = `0:${timeInput}`;
        else if (timeInput.length === 3) ft = `${timeInput.slice(0, 1)}:${timeInput.slice(1)}`;
        else if (timeInput.length === 4) {
            const m = parseInt(timeInput.slice(0, 2), 10);
            if (m < 10) ft = `${m}:${timeInput.slice(2)}`;
            else ft = `${timeInput.slice(0, 1)}:${timeInput.slice(1,3)}`;
        }
        timeDisplay.value = ft;
    };

    // --- Core App Logic ---
    addRecordBtn.addEventListener('click', () => {
        // Validate that all inputs have been selected.
        if (timeInput === "" || !selectedNumber || !selectedColor || !selectedEvent) {
            alert("時間とすべての項目を選択してください。");
            return;
        }

        // Calculate the score at the time of this record.
        let scoreWhite = 0, scoreBlue = 0;
        records.forEach(r => { 
            if (['得点', 'ペナルティ得点', '退水得点'].includes(r.event)) {
                if (r.color === '白') scoreWhite++; else scoreBlue++;
            }
        });
        if (['得点', 'ペナルティ得点', '退水得点'].includes(selectedEvent)) {
            if (selectedColor === '白') scoreWhite++; else scoreBlue++;
        }
        const currentScore = `${scoreWhite}-${scoreBlue}`;

        // Create a new record object.
        const newRecord = { 
            id: Date.now(), 
            period: (selectedEvent === 'センターボール') ? period + 1 : period, 
            time: timeDisplay.value, 
            number: selectedNumber, 
            color: selectedColor, 
            event: selectedEvent, 
            score: currentScore 
        };

        if (newRecord.event === 'センターボール') {
            period++;
        }

        records.push(newRecord);
        renderRecords();
        resetInputs();
    });

    /**
     * Resets all input fields and selections to their initial state.
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
     * Renders the entire list of records and updates the main score display.
     */
    const renderRecords = () => {
        recordList.innerHTML = "";
        let scoreWhite = 0, scoreBlue = 0;

        // Sort records by period, then by time descending.
        records.sort((a, b) => {
            if (a.period !== b.period) return a.period - b.period;
            const tA = a.time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            const tB = b.time.split(':').reduce((acc, t) => 60 * acc + +t, 0);
            return tB - tA;
        });

        records.forEach(rec => {
            if (['得点', 'ペナルティ得点', '退水得点'].includes(rec.event)) {
                if (rec.color === '白') scoreWhite++; else scoreBlue++;
            }
            const row = document.createElement('tr');
            row.innerHTML = `<td>${rec.period}</td><td>${rec.time}</td><td>${rec.number}</td><td class="${rec.color === '白' ? 'white-cell' : 'blue-cell'}">${rec.color}</td><td>${rec.event}</td><td>${rec.score}</td><td><button class="delete-btn" data-id="${rec.id}">×</button></td>`;
            recordList.appendChild(row);
        });

        scoreWhiteDisplay.textContent = scoreWhite;
        scoreBlueDisplay.textContent = scoreBlue;
        periodDisplay.textContent = period;

        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', deleteRecord));
    };

    /**
     * Deletes a record based on its ID.
     * @param {Event} e - The click event from the delete button.
     */
    const deleteRecord = (e) => {
        const id = Number(e.target.dataset.id);
        const rec = records.find(r => r.id === id);

        if (rec && rec.event === 'センターボール') {
            period--;
        }

        records = records.filter(r => r.id !== id);
        renderRecords();
    };

    // --- CSV Export ---
    exportCsvBtn.addEventListener('click', () => {
        if (records.length === 0) {
            alert("エクスポートする記録がありません。");
            return;
        }
        let csv = "ピリオド,時間,番号,色,イベント,得点\n";
        records.forEach(r => {
            csv += [r.period, r.time, r.number, r.color, r.event, `"${r.score}"`].join(',') + "\n";
        });

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // BOM for Excel compatibility
        const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const now = new Date();
        const ts = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
        a.download = `waterpolo_record_${ts}.csv`;

        a.click();
        URL.revokeObjectURL(url);
    });

    // Start the application.
    initializeButtons();
});

