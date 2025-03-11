/*
{
    filePath: '123',
    options: [ option1: true, option2: true, option3: true ]
}
*/

const fs = require('fs');
const textToSpeech = require('./textToSpeech.js');
const {
    EnglishToVietnamese,
    multipleChoice,
    VietnameseToEnglish,
} = require('./options.js');

const createQuestion = (content, type = '') => {
    let uniqueContent = content;
    if (type !== 'json') {
        const contentObject = content
            .filter((item) => item.includes(':'))
            .map((item) => {
                return {
                    word: item.split(':')[0]?.trim(),
                    meaning: item.split(':')[1]?.trim(),
                };
            });

        uniqueContent = Array.from(
            new Map(contentObject.map((item) => [item.word, item])).values()
        );
    }

    const result = [];
    uniqueContent.forEach((item) => {
        let firstQuestion = {
            question: item.word,
            options: [item.meaning],
            ...item,
        };

        while (firstQuestion.options.length < 4) {
            const randomMeaning =
                uniqueContent[Math.floor(Math.random() * uniqueContent.length)]
                    .meaning;
            if (!firstQuestion.options.includes(randomMeaning)) {
                firstQuestion.options.push(randomMeaning);
            }
        }

        result.push(firstQuestion);
    });

    return result;
};

const readFileContent = async (path) => {
    try {
        const res = await fs.promises.readFile(path, 'utf-8');

        return res.split('\n');
    } catch (e) {
        console.error('Error reading file:', e);
        return null;
    }
};

const readFileJson = async (path) => {
    try {
        const data = await fs.promises.readFile(path, 'utf8');
        const jsonData = JSON.parse(data);
        return jsonData;
    } catch (e) {
        console.error('Lỗi khi đọc file hoặc parse JSON:', e.message);
        return null;
    }
};

const creatCard = async (data, path, type = '') => {
    let content = '';
    if (type !== 'json') {
        content = await readFileContent(data.filePath);
    } else {
        content = await readFileJson(data.filePath);
    }

    const questions = createQuestion(content, type);
    const numberOfQuestions = questions.length;
    const limit = data.limit;

    try {
        let result = [];
        let audioPromises = [];

        for (let i = 0; i < numberOfQuestions; i++) {
            let audio;
            if (type !== 'json') {
                if (data.subscriptionKey) {
                    audio = (async () => {
                        // Create audio
                        await textToSpeech(
                            questions[i].question,
                            path,
                            data.subscriptionKey
                        );
                    })();
                }
                audioPromises.push(audio);
            }

            let deckName = data.deckName;
            if (limit != 0 && type === 'json') {
                let numberPart = Math.floor(i / limit) + 1;
                deckName = `${deckName}::Part ${numberPart}`;
            }

            let date = new Date();
            date = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

            if (data.options.includes('Multiple Choice')) {
                result.push(
                    multipleChoice({
                        item: questions[i],
                        date,
                        path,
                        deckName,
                        type,
                    })
                );
            }

            if (data.options.includes('Eng-Vie')) {
                result.push(
                    EnglishToVietnamese({
                        item: questions[i],
                        date,
                        path,
                        deckName,
                        type,
                    })
                );
            }

            if (data.options.includes('Vie-Eng')) {
                result.push(
                    VietnameseToEnglish({
                        item: questions[i],
                        date,
                        path,
                        deckName,
                        type,
                    })
                );
            }
        }

        if (type !== 'json') {
            // Chờ tất cả các file âm thanh được render
            await Promise.all(audioPromises);
            console.log('Tất cả file âm thanh đã được render xong');
        }

        return result;
    } catch (error) {
        console.error('Error creating card:', error);
        return null;
    }
};

const createDeck = async (deckName) => {
    const data = {
        action: 'createDeck',
        version: 6,
        params: {
            deck: deckName,
        },
    };

    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // await delay(500);
        return await response.json();

        // Delay 500 ms giữa các yêu cầu
    } catch (error) {
        console.error(`Error creating deck '${deckName}':`, error);
    }
};

const getDeckNames = async () => {
    try {
        const response = await fetch('http://localhost:8765', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'deckNames',
                version: 6,
            }),
        });

        const data = await response.json();
        return data.result;
    } catch (error) {
        console.error('Failed to fetch deck names:', error.message);
    }
};

const fetchAPI = async (data, path, type) => {
    // data:: {
    //     filePath: '/home/youngmarco/Downloads/test.txt',
    //     deckName: '123',
    //     options: [ 'Multiple Choice' ]
    // }

    const cards = await creatCard(data, path, type);

    const getDecks = await getDeckNames();
    if (!getDecks.includes('Vocabulary')) {
        await createDeck('Vocabulary');
    }

    const processed = new Set();
    for (const deck of cards) {
        if (!processed.has(deck.deckName)) {
            await createDeck(deck.deckName);
            processed.add(deck.deckName);
        }
    }

    const url = 'http://localhost:8765';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addNotes',
                version: 6,
                params: {
                    notes: cards,
                },
            }),
        });

        return await response.json();
    } catch (error) {
        console.error('Error sending request:', error);
    }
};

module.exports = fetchAPI;
