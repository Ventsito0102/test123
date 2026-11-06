let appData = {
    cash: 0,
    cards: [],
    transactions: []
};

// Зареждане при стартиране
async function loadData() {
    try {
        const response = await fetch('/api/data');
        appData = await response.json();
        if (typeof appData.cash !== 'number') appData.cash = 0;
        if (!appData.cards) appData.cards = [];
        if (!appData.transactions) appData.transactions = [];
        
        updateUI();
    } catch (err) {
        console.error("Грешка при зареждане:", err);
    }
}

// Запис на сървъра
async function saveData() {
    try {
        await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
    } catch (err) {
        console.error("Грешка при запис:", err);
    }
}

// Директно обновяване на кеша (задаване на сума или корекция)
async function updateCashDirectly() {
    const inputVal = parseFloat(document.getElementById('cashInput').value);
    if (isNaN(inputVal)) {
        alert('Моля, въведи валидна сума!');
        return;
    }

    appData.cash += inputVal; // Може да се слага + или - сума
    
    appData.transactions.push({
        id: Date.now(),
        desc: inputVal >= 0 ? 'Добавяне на кеш' : 'Корекция / Намаляване на кеш',
        amount: inputVal,
        source: '💵 Кеш в брой'
    });

    await saveData();
    updateUI();
    document.getElementById('cashInput').value = '';
}

// Добавяне на нова дебитна карта
async function addCard() {
    const name = document.getElementById('cardName').value.trim();
    const balance = parseFloat(document.getElementById('cardBalance').value);

    if (!name || isNaN(balance)) {
        alert('Моля, попълни име на картата и начален баланс!');
        return;
    }

    const newCard = {
        id: Date.now(),
        name,
        balance
    };

    appData.cards.push(newCard);
    await saveData();
    updateUI();

    document.getElementById('cardName').value = '';
    document.getElementById('cardBalance').value = '';
}

// Трансфер между Кеш и Карти
async function makeTransfer() {
    const from = document.getElementById('transferFrom').value;
    const to = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);

    if (!from || !to || isNaN(amount) || amount <= 0) {
        alert('Моля, избери коректни източник, получател и сума!');
        return;
    }

    if (from === to) {
        alert('Не можеш да превеждаш към същия портфейл!');
        return;
    }

    // Проверка и изваждане от източника
    let fromName = '';
    if (from === 'cash') {
        if (appData.cash < amount) {
            alert('Нямаш достатъчно пари в кеш!');
            return;
        }
        appData.cash -= amount;
        fromName = '💵 Кеш';
    } else {
        const card = appData.cards.find(c => c.id == from);
        if (card.balance < amount) {
            alert(`Нямаш достатъчно средства в карта ${card.name}!`);
            return;
        }
        card.balance -= amount;
        fromName = `💳 ${card.name}`;
    }

    // Добавяне към получателя
    let toName = '';
    if (to === 'cash') {
        appData.cash += amount;
        toName = '💵 Кеш';
    } else {
        const card = appData.cards.find(c => c.id == to);
        card.balance += amount;
        toName = `💳 ${card.name}`;
    }

    appData.transactions.push({
        id: Date.now(),
        desc: `Трансфер: ${fromName} ➔ ${toName}`,
        amount: amount,
        source: '🔄 Вътрешен трансфер'
    });

    await saveData();
    updateUI();
    document.getElementById('transferAmount').value = '';
}

// Добавяне на приход или разход
async function addTransaction() {
    const desc = document.getElementById('desc').value.trim();
    const amountInput = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const source = document.getElementById('transactionSource').value;

    if (!desc || isNaN(amountInput) || !source) {
        alert('Моля, попълни всички полета!');
        return;
    }

    const finalAmount = type === 'expense' ? -Math.abs(amountInput) : Math.abs(amountInput);

    let sourceName = '';
    if (source === 'cash') {
        appData.cash += finalAmount;
        sourceName = '💵 Кеш в брой';
    } else {
        const card = appData.cards.find(c => c.id == source);
        card.balance += finalAmount;
        sourceName = `💳 ${card.name}`;
    }

    appData.transactions.push({
        id: Date.now(),
        desc,
        amount: finalAmount,
        source: sourceName
    });

    await saveData();
    updateUI();

    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
}

// Обновяване на целия интерфейс
function updateUI() {
    // 1. Показване на кеш баланс
    document.getElementById('cashBalanceDisplay').innerText = appData.cash.toFixed(2) + ' лв.';

    // 2. Рендиране на карти
    const cardsContainer = document.getElementById('cardsList');
    cardsContainer.innerHTML = '';

    if (appData.cards.length === 0) {
        cardsContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; font-size: 0.85rem; padding: 5px;">Няма добавени карти</div>';
    } else {
        appData.cards.forEach(card => {
            const div = document.createElement('div');
            div.className = 'card-item';
            div.innerHTML = `
                <span>💳 ${card.name}</span>
                <span style="color: ${card.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
                    ${card.balance.toFixed(2)} лв.
                </span>
            `;
            cardsContainer.appendChild(div);
        });
    }

    // 3. Обновяване на падащите менюта (Dropdowns)
    updateDropdowns();

    // 4. История и сумарен баланс
    renderTransactions();
    updateTotalSummary();
}

function updateDropdowns() {
    const fromSelect = document.getElementById('transferFrom');
    const toSelect = document.getElementById('transferTo');
    const txSourceSelect = document.getElementById('transactionSource');

    let optionsHTML = `
        <option value="" disabled selected>Избери портфейл/карта...</option>
        <option value="cash">💵 Пари в кеш (${appData.cash.toFixed(2)} лв.)</option>
    `;

    appData.cards.forEach(card => {
        optionsHTML += `<option value="${card.id}">💳 ${card.name} (${card.balance.toFixed(2)} лв.)</option>`;
    });

    fromSelect.innerHTML = optionsHTML;
    toSelect.innerHTML = optionsHTML;
    txSourceSelect.innerHTML = optionsHTML;
}

function renderTransactions() {
    const list = document.getElementById('transactionList');
    list.innerHTML = '';

    if (appData.transactions.length === 0) {
        list.innerHTML = '<li style="text-align:center; color: var(--text-muted); padding: 10px; font-size: 0.85rem;">Няма записани транзакции</li>';
        return;
    }

    appData.transactions.slice().reverse().forEach(t => {
        const li = document.createElement('li');
        li.className = 'transaction-item';
        
        let colorClass = t.amount >= 0 ? 'income' : 'expense';
        let prefix = t.amount > 0 ? '+' : '';

        li.innerHTML = `
            <div class="transaction-details">
                <span>${t.desc}</span>
                <span class="transaction-source-tag">${t.source}</span>
            </div>
            <span class="${colorClass}">
                ${prefix}${t.amount.toFixed(2)} лв.
            </span>
        `;
        list.append(li);
    });
}

function updateTotalSummary() {
    const totalCards = appData.cards.reduce((acc, c) => acc + c.balance, 0);
    const totalGeneral = appData.cash + totalCards;

    document.getElementById('cashSummary').innerText = appData.cash.toFixed(2) + ' лв.';
    document.getElementById('cardsSummary').innerText = totalCards.toFixed(2) + ' лв.';
    document.getElementById('totalBalance').innerText = totalGeneral.toFixed(2) + ' лв.';
}

loadData();