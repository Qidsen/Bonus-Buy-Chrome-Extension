document.addEventListener('DOMContentLoaded', () => {
    const displayBalance = document.getElementById('displayBalance');
    const averageXDisplay = document.getElementById('averageX');
    const requiredAverageXDisplay = document.getElementById('requiredAverageX');
    const slotCountDisplay = document.getElementById('slotCount');

    const slotIndexInput = document.getElementById('slotIndex');
    const slotsDiv = document.getElementById('slots');

    const addBalanceInput = document.getElementById('addBalance');
    const addBalanceButton = document.getElementById('addBalanceButton');

    const slotNameInput = document.getElementById('slotName');
    const purchaseAmountInput = document.getElementById('purchaseAmount');
    const winAmountInput = document.getElementById('winAmount');
    const playedCheckbox = document.getElementById('played');
    const addSlotButton = document.getElementById('addSlot');

    const mainPageButton = document.getElementById('mainPageButton');
    const historyPageButton = document.getElementById('historyPageButton');
    const mainPage = document.getElementById('mainPage');
    const historyPage = document.getElementById('historyPage');
    const historyList = document.getElementById('historyList');
    const saveHistoryButton = document.getElementById('saveHistoryButton');
    const prevHistoryButton = document.getElementById('prevHistory');
    const nextHistoryButton = document.getElementById('nextHistory');

    let balance = 0;
    let slots = [];
    let history = [];

    // Загрузка данных из хранилища
    chrome.storage.sync.get(['balance', 'slots'], (data) => {
        balance = data.balance || 0;
        slots = data.slots || [];
        updateDisplay();
        displaySlots();
    });

    // Загрузка истории из chrome.storage.local
    chrome.storage.local.get(['history'], (data) => {
        history = data.history || [];
        displayHistory();
    });

    addBalanceButton.addEventListener('click', addBalance);

    addBalanceInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            addBalance();
        }
    });

    function addBalance() {
        const amount = parseFloat(addBalanceInput.value);
        if (!isNaN(amount)) {
            balance = amount;
            chrome.storage.sync.set({ balance: balance });
            updateDisplay();
            addBalanceInput.value = '';
        }
    }

    addSlotButton.addEventListener('click', () => {
        const slot = {
            name: slotNameInput.value,
            purchase: parseFloat(purchaseAmountInput.value),
            win: parseFloat(winAmountInput.value),
            played: playedCheckbox.checked,
        };

        const slotIndex = parseInt(slotIndexInput.value);
        if (isNaN(slotIndex)) {
            slots.push(slot);
        } else {
            slots[slotIndex] = slot;
            slotIndexInput.value = '';
            addSlotButton.textContent = 'Add Slot';
        }

        chrome.storage.sync.set({ slots: slots });
        updateDisplay();
        displaySlots();
        clearInputs();
    });

    function updateDisplay() {
        displayBalance.textContent = balance.toFixed(2);
        let playedSlots = slots.filter((slot) => slot.played);
        let totalPurchase = playedSlots.reduce((sum, slot) => sum + slot.purchase, 0);
        let totalWin = playedSlots.reduce((sum, slot) => sum + slot.win, 0);

        let averageX = totalPurchase > 0 ? totalWin / totalPurchase : 0;
        averageXDisplay.textContent = averageX.toFixed(2);

        let unplayedSlots = slots.filter((slot) => !slot.played);
        let unplayedPurchase = unplayedSlots.reduce((sum, slot) => sum + slot.purchase, 0);
        let requiredWin = balance - (totalWin - totalPurchase);
        let requiredAverageX = unplayedPurchase > 0 ? requiredWin / unplayedPurchase : 0;
        requiredAverageXDisplay.textContent = requiredAverageX.toFixed(2);

        slotCountDisplay.textContent = `${playedSlots.length}/${slots.length}`;
    }

    function clearInputs() {
        slotNameInput.value = '';
        purchaseAmountInput.value = '';
        winAmountInput.value = '';
        playedCheckbox.checked = false;
        addSlotButton.textContent = 'Add Slot';
    }

    function displaySlots() {
        slotsDiv.innerHTML = '';
        slots.forEach((slot, index) => {
            const slotItem = document.createElement('div');
            slotItem.className = 'slotItem';
            if (slot.played) {
                slotItem.classList.add('played');
            }
            const xValue = slot.purchase > 0 ? (slot.win / slot.purchase).toFixed(2) : 0;
            const xValueClass = xValue >= 1 ? 'positive' : 'negative';
            slotItem.innerHTML = `
        <span>${index + 1}. ${slot.name}: ${slot.purchase.toFixed(2)}&#8372; -> ${slot.win.toFixed(2)}&#8372; (<span class="${xValueClass}">${xValue}x</span>)</span>
        <div>
          <img src="icons/edit.svg" class="editSlot" data-index="${index}" width="20" height="20">
          <img src="icons/delete.svg" class="deleteSlot" data-index="${index}" width="20" height="20">
        </div>
      `;
            slotsDiv.appendChild(slotItem);
        });

        // Добавляем обработчики событий для кнопок "Edit" и "Delete"
        document.querySelectorAll('.editSlot').forEach((button) => {
            button.addEventListener('click', (event) => {
                const index = parseInt(event.target.dataset.index);
                loadSlotForEdit(index);
            });
        });

        document.querySelectorAll('.deleteSlot').forEach((button) => {
            button.addEventListener('click', (event) => {
                const index = parseInt(event.target.dataset.index);
                deleteSlot(index);
            });
        });
    }

    function loadSlotForEdit(index) {
        const slot = slots[index];
        slotIndexInput.value = index;
        slotNameInput.value = slot.name;
        purchaseAmountInput.value = slot.purchase;
        winAmountInput.value = slot.win;
        playedCheckbox.checked = slot.played;
        addSlotButton.textContent = 'Update Slot';
    }

    function deleteSlot(index) {
        slots.splice(index, 1);
        chrome.storage.sync.set({ slots: slots });
        updateDisplay();
        displaySlots();
    }

    mainPageButton.addEventListener('click', () => {
        mainPage.style.display = 'block';
        historyPage.style.display = 'none';
        mainPageButton.classList.add('active');
        historyPageButton.classList.remove('active');
    });

    historyPageButton.addEventListener('click', () => {
        mainPage.style.display = 'none';
        historyPage.style.display = 'block';
        mainPageButton.classList.remove('active');
        historyPageButton.classList.add('active');
    });

    saveHistoryButton.addEventListener('click', () => {
        const historyItem = {
            balance: balance,
            slots: slots,
            timestamp: new Date().toLocaleString(),
        };
        history.push(historyItem);
        chrome.storage.local.set({ history: history });
        clearAll();
        displayHistory();
    });

    function displayHistorySlots(slots, container) {
        container.innerHTML = '';
        slots.forEach((slot, index) => {
            const slotItem = document.createElement('div');
            slotItem.className = 'slotItem';
            if (slot.played) {
                slotItem.classList.add('played');
            }
            const xValue = slot.purchase > 0 ? (slot.win / slot.purchase).toFixed(2) : 0;
            const xValueClass = xValue >= 1 ? 'positive' : 'negative';
            slotItem.innerHTML = `
            <span>${index + 1}. ${slot.name}: ${slot.purchase.toFixed(2)}&#8372; -> ${slot.win.toFixed(2)}&#8372; (<span class="${xValueClass}">${xValue}x</span>)</span>
        `;
            container.appendChild(slotItem);
        });
    }

    let historyPageIndex = 0;
    const historyPageSize = 1;

    function displayHistory() {
        historyList.innerHTML = '';
        const startIndex = historyPageIndex * historyPageSize;
        const endIndex = startIndex + historyPageSize;
        const currentHistory = history.slice(startIndex, endIndex);
        currentHistory.forEach((item, index) => {
            const historyItemDiv = document.createElement('div');
            historyItemDiv.className = 'historyItem';
            const playedSlots = item.slots.filter(slot => slot.played);
            const totalPurchase = playedSlots.reduce((sum, slot) => sum + slot.purchase, 0);
            const totalWin = playedSlots.reduce((sum, slot) => sum + slot.win, 0);
            const averageX = totalPurchase > 0 ? (totalWin / totalPurchase).toFixed(2) : 0;
            const unplayedSlots = item.slots.filter(slot => !slot.played);
            const unplayedPurchase = unplayedSlots.reduce((sum, slot) => sum + slot.purchase, 0);
            const requiredWin = item.balance - (totalWin - totalPurchase);
            const requiredAverageX = unplayedPurchase > 0 ? (requiredWin / unplayedPurchase).toFixed(2) : 0;
            historyItemDiv.innerHTML = `
        <h3>Bonus Buy #${historyPageIndex + 1}</h3>
        <div class="left-container">
            <div class="info-container">
                <div class="info-row">
                    <div class="info-item">
                        <span class="icon">&#x1F4B0;</span><p>${item.balance.toFixed(2)}&#8372;</p>
                    </div>
                    <div class="info-item">
                        <span class="icon">&#x274C;</span><p>${averageX}</p>
                    </div>
                    <div class="info-item">
                        <span class="icon">&#x1F4C8;</span><p>${requiredAverageX}</p>
                    </div>
                    <div class="info-item">
                        <span class="icon">&#x1F4DD;</span><p>${playedSlots.length}/${item.slots.length}</p>
                    </div>
                </div>
            </div>
            <div id="slotList" class="slot-list">
                <h2>Slot List</h2>
                <div id="historySlotsContainer${index}"></div>
            </div>
        </div>
      `;
            historyList.appendChild(historyItemDiv);
            displayHistorySlots(item.slots, document.getElementById(`historySlotsContainer${index}`));
        });

        prevHistoryButton.disabled = historyPageIndex === 0;
        nextHistoryButton.disabled = endIndex >= history.length;
    }

    prevHistoryButton.addEventListener('click', () => {
        if (historyPageIndex > 0) {
            historyPageIndex--;
            displayHistory();
        }
    });

    nextHistoryButton.addEventListener('click', () => {
        if ((historyPageIndex + 1) * historyPageSize < history.length) {
            historyPageIndex++;
            displayHistory();
        }
    });

    function clearAll() {
        balance = 0;
        slots = [];
        chrome.storage.sync.set({ balance: balance, slots: slots });
        updateDisplay();
        displaySlots();
    }
});
