/*
{
    filePath: '123',
    options: [ option1: true, option2: true, option3: true ]
}
*/

import fs from 'fs';
import textToSpeech from './textToSpeech.mjs';
import {
    EnglishToVietnamese,
    multipleChoice,
    VietnameseToEnglish,
} from './options.mjs';

const createQuestion = (content) => {
    const contentObject = content
        .filter((item) => item.includes(':'))
        .map((item) => {
            return {
                word: item.split(':')[0]?.trim(),
                meaning: item.split(':')[1]?.trim(),
            };
        });

    const uniqueContent = Array.from(
        new Map(contentObject.map((item) => [item.word, item])).values()
    );

    const result = [];
    uniqueContent.forEach((item) => {
        let firstQuestion = {
            question: item.word,
            options: [item.meaning],
        };

        let secondQuestion = {
            question: item.meaning,
            options: [item.word],
        };

        while (firstQuestion.options.length < 4) {
            const randomMeaning =
                uniqueContent[Math.floor(Math.random() * uniqueContent.length)]
                    .meaning;
            if (!firstQuestion.options.includes(randomMeaning)) {
                firstQuestion.options.push(randomMeaning);
            }
        }

        while (secondQuestion.options.length < 4) {
            const randomMeaning =
                uniqueContent[Math.floor(Math.random() * uniqueContent.length)]
                    .word;
            if (!secondQuestion.options.includes(randomMeaning)) {
                secondQuestion.options.push(randomMeaning);
            }
        }
        result.push(firstQuestion);
        // result.push(secondQuestion);
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

const creatCard = async (data, path, subscriptionKey) => {
    const content = await readFileContent(data.filePath);
    const questions = createQuestion(content);

    let result = [];
    let audioPromises = [];

    try {
        for (const item of questions) {
            // Check if card exists
            // const isExist = await checkCardExists(item.question);
            // const isExist2 = await checkCardExists(item.options[0]);
            // if (isExist || isExist2) {
            //     continue;
            // }

            // Create audio
            let audio;
            if (data.subscriptionKey) {
                audio = (async () => {
                    // Create audio
                    await textToSpeech(
                        item.question,
                        path,
                        data.subscriptionKey
                    );
                })();
            }

            const deckName = data.deckName;

            let date = new Date();
            date = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

            if (data.options.includes('Multiple Choice')) {
                result.push(multipleChoice(item, date, path, deckName));
            }

            if (data.options.includes('Eng-Vie')) {
                result.push(EnglishToVietnamese(item, date, path, deckName));
            }

            if (data.options.includes('Vie-Eng')) {
                result.push(VietnameseToEnglish(item, date, path, deckName));
            }

            audioPromises.push(audio);
        }
        // Chờ tất cả các file âm thanh được render
        await Promise.all(audioPromises);
        console.log('Tất cả file âm thanh đã được render xong');

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

const fetchAPI = async (data, path) => {
    console.log('data::', data);

    // data:: {
    //     filePath: '/home/youngmarco/Downloads/test.txt',
    //     deckName: '123',
    //     options: [ 'Multiple Choice' ]
    // }

    // Validate
    if (!data.filePath) {
        return 'File path is required';
    }

    if (!data.options) {
        return 'Options are required';
    }

    const cards = await creatCard(data, path);
    const deckName = data.deckName;

    // Check exist deck
    // const decks = ['Vocabulary', 'Multiple Choice', 'Eng-Vie', 'Vie-Eng'];

    const getDecks = await getDeckNames();
    if (!getDecks.includes('Vocabulary')) {
        await createDeck('Vocabulary');
    }

    console.log('waitting for create deck.......');

    for (const deck of data.options) {
        if (!getDecks.includes(`Vocabulary::${deckName}::${deck}`)) {
            await createDeck(`Vocabulary::${deckName}::${deck}`);

            console.log(`Vocabulary::${deckName}::${deck}`);
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

export default fetchAPI;
