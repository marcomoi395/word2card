document.getElementById('upload-btn').addEventListener('click', async () => {
    const result = await window.electron.openFileDialog();
    if (result.filePath) {
        document.getElementById('filePath').value = result.filePath;
    }
});

const submitBtn = document.getElementById('submitBtn');
submitBtn.addEventListener('click', async () => {
    const filePath = document.getElementById('filePath').value;
    const deckName = document.getElementById('deckName').value;
    const subscriptionKey = document.getElementById('subscriptionKey').value;
    const option1 = document.getElementById('option1').checked;
    const option2 = document.getElementById('option2').checked;
    const option3 = document.getElementById('option3').checked;

    const options = [];
    if (option1) {
        options.push('Multiple Choice');
    }

    if (option2) {
        options.push('Eng-Vie');
    }

    if (option3) {
        options.push('Vie-Eng');
    }

    const data = {
        filePath,
        deckName,
        options: options,
        subscriptionKey: subscriptionKey,
    };

    window.electron.ipcRenderer.send('submit-data', data);
});
