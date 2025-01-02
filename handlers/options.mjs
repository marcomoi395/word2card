export const multipleChoice = (item, date, path, deckName) => {
    return {
        // "deckName": `Vocabulary::${date}`,
        deckName: `Vocabulary::${deckName}::Multiple Choice`,
        modelName: 'Multiple Choice',
        fields: {
            Question: item.question,
            Title: 'What mean???',
            'Qtype (0=kprim,1=mc,2=sc)': '2',
            Q_1: item.options[0],
            Q_2: item.options[1],
            Q_3: item.options[2],
            Q_4: item.options[3],
            Answers: '1 0 0 0',
        },
        tags: [date, 'Vocabulary', 'Multiplechoice'],
        audio: [
            {
                path: `${path}/audio/${item.question.split(' ').join('-')}.wav`,
                filename: `${item.question.split(' ').join('-')}.wav`,
                fields: ['Audio'],
            },
        ],
        options: {
            allowDuplicate: true,
        },
    };
};

export const EnglishToVietnamese = (item, date, path, deckName) => {
    return {
        deckName: `Vocabulary::${deckName}::Eng-Vie`,
        modelName: 'Eng-Vie Translations',
        fields: {
            Front: item.question,
            Back: item.options[0],
        },
        tags: [date, 'Vocabulary', 'Eng - Vie'],
        audio: [
            {
                path: `${path}/audio/${item.question.split(' ').join('-')}.wav`,
                filename: `${item.question.split(' ').join('-')}.wav`,
                fields: ['Audio'],
            },
        ],
        options: {
            allowDuplicate: true,
        },
    };
};

export const VietnameseToEnglish = (item, date, path, deckName) => {
    return {
        deckName: `Vocabulary::${deckName}::Vie-Eng`,
        modelName: 'Eng-Vie Translations',
        fields: {
            Front: item.options[0],
            Back: item.question,
        },
        tags: [date, 'Vocabulary', 'Vie - Eng'],
        audio: [
            {
                path: `${path}/audio/${item.question.split(' ').join('-')}.wav`,
                filename: `${item.question.split(' ').join('-')}.wav`,
                fields: ['Audio'],
            },
        ],
        options: {
            allowDuplicate: true,
        },
    };
};

