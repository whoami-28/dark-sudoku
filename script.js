// Переменные игры
let solution = [];
let puzzle = [];
let currentBoard = [];
let initialMask = []; // Флаг начальных чисел (чтобы не могли менять)
let selectedRow = -1;
let selectedCol = -1;
let currentDifficulty = 'easy';
let mistakesCount = 0;
let timerInterval = null;
let secondsElapsed = 0;
let isGameFinished = false;

// Настройки сложности (количество пустых ячеек)
const DIFFICULTY_HOLES = {
    easy: 32,
    medium: 44,
    hard: 54
};

const DIFFICULTY_LABELS = {
    easy: 'Легкий',
    medium: 'Средний',
    hard: 'Сложный'
};

// Генерация рандомного поля
function generateSolvedSudoku() {
    let grid = [];
    for (let r = 0; r < 9; r++) {
        grid[r] = [];
        for (let c = 0; c < 9; c++) {
            grid[r][c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
        }
    }

    // Вспомогательная функция обмена двух строк
    function swapRows(b, r1, r2) {
        const temp = b[r1];
        b[r1] = b[r2];
        b[r2] = temp;
    }
    // Вспомогательная функция обмена двух столбцов
    function swapCols(b, c1, c2) {
        for (let r = 0; r < 9; r++) {
            const temp = b[r][c1];
            b[r][c1] = b[r][c2];
            b[r][c2] = temp;
        }
    }
    // Вспомогательная функция обмена блоков горизонтально
    function swapRowBlocks(b, b1, b2) {
        for (let i = 0; i < 3; i++) {
            swapRows(b, b1 * 3 + i, b2 * 3 + i);
        }
    }
    // Вспомогательная функция обмена блоков вертикально
    function swapColBlocks(b, b1, b2) {
        for (let i = 0; i < 3; i++) {
            swapCols(b, b1 * 3 + i, b2 * 3 + i);
        }
    }
    // Функция транспонирования
    function transpose(b) {
        for (let r = 0; r < 9; r++) {
            for (let c = r + 1; c < 9; c++) {
                const temp = b[r][c];
                b[r][c] = b[c][r];
                b[c][r] = temp;
            }
        }
    }
    // Вспомогательная функция взаимной подстановки двух чисел
    function swapNumbers(b, num1, num2) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (b[r][c] === num1) b[r][c] = num2;
                else if (b[r][c] === num2) b[r][c] = num1;
            }
        }
    }

    // Рандомная генерация
    const iterations = 40;
    for (let i = 0; i < iterations; i++) {
        const action = Math.floor(Math.random() * 5);
        const block = Math.floor(Math.random() * 3);
        const offset1 = Math.floor(Math.random() * 3);
        const offset2 = Math.floor(Math.random() * 3);

        if (action === 0) {
            // Обмен двух строк в пределах одной блочной строки
            swapRows(grid, block * 3 + offset1, block * 3 + offset2);
        } else if (action === 1) {
            // Обмен двух строк в пределах одного блочного столбца
            swapCols(grid, block * 3 + offset1, block * 3 + offset2);
        } else if (action === 2) {
            // Обмен двух блочных строк
            const b2 = Math.floor(Math.random() * 3);
            swapRowBlocks(grid, block, b2);
        } else if (action === 3) {
            // Обмен двух блочных столбцов
            const b2 = Math.floor(Math.random() * 3);
            swapColBlocks(grid, block, b2);
        } else if (action === 4) {
            // Обмен местами случайных цифр
            const n1 = Math.floor(Math.random() * 9) + 1;
            const n2 = Math.floor(Math.random() * 9) + 1;
            if (n1 !== n2) swapNumbers(grid, n1, n2);
        }
    }
    // Транспонирование сети с вероятностью 50%
    if (Math.random() > 0.5) {
        transpose(grid);
    }

    return grid;
}
// Генерация задачи, посредством очистки некотрых ячеек
function createPuzzleFromSolution(solvedBoard, emptyCount) {
    let pz = solvedBoard.map(row => [...row]);
    let mask = Array(9).fill(false).map(() => Array(9).fill(false));

    let coords = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            coords.push([r, c]);
        }
    }

    // Тассовка Фишера-Йетса
    for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
    }

    // Очистка в соответсвии со сложностью
    for (let i = 0; i < emptyCount; i++) {
        const [r, c] = coords[i];
        pz[r][c] = 0;
    }

    // Защита заполненных клеток
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (pz[r][c] !== 0) {
                mask[r][c] = true;
            }
        }
    }

    return { puzzle: pz, initialMask: mask };
}
// Получение DOM-объектов
const gridElement = document.getElementById('grid');
const timerElement = document.getElementById('timer');
const mistakesElement = document.getElementById('mistakes');
const diffTextElement = document.getElementById('difficulty-text');
const messageBanner = document.getElementById('message-banner');
// Создание сетки
function initDOMGrid() {
    gridElement.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', () => selectCell(r, c));
            gridElement.appendChild(cell);
        }
    }
}
// Получение координат ячейки
function getCellElement(r, c) {
    return gridElement.children[r * 9 + c];
}
// Синхронизация массива и сетки
function renderBoard() {
    const activeVal = (selectedRow !== -1 && selectedCol !== -1) ? currentBoard[selectedRow][selectedCol] : 0;
    const selBlockR = selectedRow !== -1 ? Math.floor(selectedRow / 3) : -1;
    const selBlockC = selectedCol !== -1 ? Math.floor(selectedCol / 3) : -1;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cellEl = getCellElement(r, c);
            const val = currentBoard[r][c];

            cellEl.textContent = val !== 0 ? val : '';
            cellEl.className = 'cell';
            // Защита
            if (initialMask[r][c]) {
                cellEl.classList.add('initial');
            } else if (val !== 0) {
                cellEl.classList.add('user-filled');
            }

            // Проверка фокуса игрока
            if (r === selectedRow && c === selectedCol) {
                cellEl.classList.add('selected');
            } else if (selectedRow !== -1) {
                const inSameRow = (r === selectedRow);
                const inSameCol = (c === selectedCol);
                const inSameBlock = (Math.floor(r / 3) === selBlockR && Math.floor(c / 3) === selBlockC);

                if (inSameRow || inSameCol || inSameBlock) {
                    cellEl.classList.add('related');
                }
            }

            // Проверка
            if (val !== 0 && activeVal !== 0 && val === activeVal && !(r === selectedRow && c === selectedCol)) {
                cellEl.classList.add('same-val');
            }
        }
    }
}
// Фокусировка
function selectCell(r, c) {
    if (isGameFinished) return;
    selectedRow = r;
    selectedCol = c;
    clearMessage();
    renderBoard();
}
// Ввод
function enterNumber(num) {
    if (isGameFinished) return;
    if (selectedRow === -1 || selectedCol === -1) {
        setMessage('Выберите ячейку для ввода');
        return;
    }

    // Защита
    if (initialMask[selectedRow][selectedCol]) {
        setMessage('Начальные цифры нельзя изменять');
        return;
    }

    const current = currentBoard[selectedRow][selectedCol];
    if (current === num) return; // No change

    // Проверка ошибок
    if (num !== 0 && num !== solution[selectedRow][selectedCol]) {
        mistakesCount++;
        mistakesElement.textContent = mistakesCount;
        
        // Получение координат ошибки
        const cellEl = getCellElement(selectedRow, selectedCol);
        cellEl.classList.add('error');
        setTimeout(() => cellEl.classList.remove('error'), 700);
    }

    currentBoard[selectedRow][selectedCol] = num;
    renderBoard();
    checkVictoryCondition();
}
// Очистка клетки
function clearSelectedCell() {
    if (isGameFinished || selectedRow === -1 || selectedCol === -1) return;
    if (initialMask[selectedRow][selectedCol]) {
        setMessage('Начальные цифры нельзя стирать');
        return;
    }
    currentBoard[selectedRow][selectedCol] = 0;
    renderBoard();
}
// Хинты
function provideHint() {
    if (isGameFinished) return;

    // Cписок пустых и ошибочных ячеек
    const candidates = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!initialMask[r][c] && currentBoard[r][c] !== solution[r][c]) {
                candidates.push({ r, c });
            }
        }
    }

    if (candidates.length === 0) {
        setMessage('Все доступные клетки уже заполнены верно!');
        return;
    }

    // Рандомный хинт
    let target = candidates[Math.floor(Math.random() * candidates.length)];
    if (selectedRow !== -1 && !initialMask[selectedRow][selectedCol] && currentBoard[selectedRow][selectedCol] !== solution[selectedRow][selectedCol]) {
        target = { r: selectedRow, c: selectedCol };
    }

    currentBoard[target.r][target.c] = solution[target.r][target.c];
    selectedRow = target.r;
    selectedCol = target.c;
    renderBoard();

    // ПОдсветка клетки с подсказкой
    const cellEl = getCellElement(target.r, target.c);
    cellEl.classList.add('correct');
    setTimeout(() => cellEl.classList.remove('correct'), 800);

    setMessage('Подсказка открыта');
    checkVictoryCondition();
}
// Проверка текущего состояния
function checkCurrentBoard() {
    if (isGameFinished) return;
    let errorsFound = 0;
    let emptyCount = 0;

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const val = currentBoard[r][c];
            const cellEl = getCellElement(r, c);
            cellEl.classList.remove('error', 'correct');

            if (val === 0) {
                emptyCount++;
            } else if (val !== solution[r][c]) {
                errorsFound++;
                cellEl.classList.add('error');
            } else if (!initialMask[r][c]) {
                cellEl.classList.add('correct');
            }
        }
    }

    setTimeout(() => {
        for (let i = 0; i < 81; i++) {
            gridElement.children[i].classList.remove('error', 'correct');
        }
    }, 1200);

    if (errorsFound > 0) {
        setMessage(`Найдено ошибок: ${errorsFound}`);
    } else if (emptyCount === 0) {
        setMessage('Все заполнено верно! Поздравляем!');
        onGameWin();
    } else {
        setMessage(`Ошибок нет. Осталось заполнить: ${emptyCount}`);
    }
}
// Проверка победы
function checkVictoryCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentBoard[r][c] !== solution[r][c]) {
                return false;
            }
        }
    }
    onGameWin();
    return true;
}
// Победа
function onGameWin() {
    if (isGameFinished) return;
    isGameFinished = true;
    stopTimer();

    const timeStr = formatTime(secondsElapsed);
    document.getElementById('game-status').textContent = 'Победа';

    // Обновление рекордов в локалстораге
    let isNewBest = false;
    const key = 'sudoku_record_' + currentDifficulty;
    const savedSec = localStorage.getItem(key);
    if (!savedSec || secondsElapsed < parseInt(savedSec, 10)) {
        localStorage.setItem(key, secondsElapsed.toString());
        isNewBest = true;
        updateRecordsDisplay();
    }

    let msg = `Время: ${timeStr}. Ошибок: ${mistakesCount}.`;
    if (isNewBest) {
        msg += '\nНовый рекорд для данного уровня!';
    }

    document.getElementById('win-description').innerText = msg;
    document.getElementById('win-modal').classList.add('visible');
}
// Начало времени
function startTimer() {
    stopTimer();
    secondsElapsed = 0;
    timerElement.textContent = "00:00";
    timerInterval = setInterval(() => {
        secondsElapsed++;
        timerElement.textContent = formatTime(secondsElapsed);
    }, 1000);
}
// Конец времени
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
// Форматирование времени
function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
// Создание сообщения
function setMessage(text) {
    messageBanner.textContent = text;
}
// Очистка сообщения
function clearMessage() {
    messageBanner.textContent = '';
}
// Обновление рекордов локалсторага
function updateRecordsDisplay() {
    ['easy', 'medium', 'hard'].forEach(diff => {
        const recEl = document.getElementById('rec-' + diff);
        const saved = localStorage.getItem('sudoku_record_' + diff);
        if (saved) {
            recEl.textContent = formatTime(parseInt(saved, 10));
        } else {
            recEl.textContent = '--:--';
        }
    });
}
// Сброс рекордов
function resetRecords() {
    localStorage.removeItem('sudoku_record_easy');
    localStorage.removeItem('sudoku_record_medium');
    localStorage.removeItem('sudoku_record_hard');
    updateRecordsDisplay();
    setMessage('Таблица рекордов очищена');
}
// Запуск новой игры
function startNewGame() {
    document.getElementById('win-modal').classList.remove('visible');
    document.getElementById('game-status').textContent = 'В процессе';
    isGameFinished = false;
    mistakesCount = 0;
    mistakesElement.textContent = '0';
    selectedRow = -1;
    selectedCol = -1;
    clearMessage();

    // Генерация готового решения
    solution = generateSolvedSudoku();
    const holes = DIFFICULTY_HOLES[currentDifficulty];
    const pzData = createPuzzleFromSolution(solution, holes);
    puzzle = pzData.puzzle;
    initialMask = pzData.initialMask;

    // Перенос на игровое поле
    currentBoard = puzzle.map(r => [...r]);

    renderBoard();
    startTimer();
}

function setupEventListeners() {
    // Кнопки сложности
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.dataset.diff;
            diffTextElement.textContent = DIFFICULTY_LABELS[currentDifficulty];
            startNewGame();
        });
    });

    // Остальные кнопки
    document.getElementById('btn-new').addEventListener('click', startNewGame);
    document.getElementById('modal-new-game-btn').addEventListener('click', startNewGame);
    document.getElementById('btn-check').addEventListener('click', checkCurrentBoard);
    document.getElementById('btn-hint').addEventListener('click', provideHint);
    document.getElementById('btn-reset-records').addEventListener('click', resetRecords);

    // Виртуальная клава
    document.querySelectorAll('.num-btn[data-num]').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.num, 10);
            enterNumber(num);
        });
    });
    document.getElementById('btn-erase').addEventListener('click', clearSelectedCell);

    // Поддержка стандартной клавы
    window.addEventListener('keydown', (e) => {
        if (isGameFinished) return;

        // Цифры
        if (e.key >= '1' && e.key <= '9') {
            enterNumber(parseInt(e.key, 10));
        }
        // Удаление
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            clearSelectedCell();
        }
        // Навигация стрелками
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (selectedRow === -1 || selectedCol === -1) {
                selectCell(4, 4);
                return;
            }
            let r = selectedRow;
            let c = selectedCol;
            if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
            if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
            if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
            if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
            selectCell(r, c);
        }
    });
}

// Инициализация окна
window.onload = function() {
    initDOMGrid();
    setupEventListeners();
    updateRecordsDisplay();
    startNewGame();
};
