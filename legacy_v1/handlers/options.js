const multipleChoice = ({
    item,
    date,
    path,
    deckName,
    type = '',
    isAudio = false,
}) => {
    const result = {
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
            Audio: isAudio
                ? type === 'json'
                    ? `<audio controls autoplay> <source src='${item.audio}' type="audio/mpeg"> </audio>`
                    : `[sound:${item.question.split(' ').join('-')}.wav]`
                : '',
            Example: item.example,
            Definition: item.definition,
            Pronunciation: item.pronunciation,
            Image: item.image || '',
        },
        tags: [date, 'Vocabulary', 'Multiplechoice'],
        options: {
            allowDuplicate: true,
        },
    };

    if (isAudio && type !== 'json') {
        result.audio = [
            {
                path: `${path}/audio/${item.question.split(' ').join('-')}.wav`,
                filename: `${item.question.split(' ').join('-')}.wav`,
                fields: ['Audio'],
            },
        ];
    }

    return result;
};

const EnglishToVietnamese = ({
    item,
    date,
    path,
    deckName,
    type = '',
    isAudio = false,
}) => {
    const result = {
        deckName: `Vocabulary::${deckName}::Eng-Vie`,
        modelName: 'Eng-Vie Translations',
        fields: {
            Front: item.question,
            Back: item.options[0],
            Audio: isAudio
                ? type === 'json'
                    ? `<audio controls autoplay> <source src='${item.audio}' type="audio/mpeg"> </audio>`
                    : `[sound:${item.question.split(' ').join('-')}.wav]`
                : '',
            Example: item.example,
            Definition: item.definition,
            Pronunciation: item.pronunciation,
            Image: item.image ? item.image : '',
        },
        tags: [date, 'Vocabulary', 'Eng - Vie'],
        options: {
            allowDuplicate: true,
        },
    };

    if (isAudio && type !== 'json') {
        result.audio = [
            {
                path: `${path}/audio/${item.question.split(' ').join('-')}.wav`,
                filename: `${item.question.split(' ').join('-')}.wav`,
                fields: ['Audio'],
            },
        ];
    }

    return result;
};

const VietnameseToEnglish = ({
    item,
    date,
    path,
    deckName,
    type = '',
    isAudio = false,
}) => {
    const result = {
        deckName: `Vocabulary::${deckName}::Vie-Eng`,
        modelName: 'Eng-Vie Translations',
        fields: {
            Front: item.options[0],
            Back: item.question,
            Audio: isAudio
                ? type === 'json'
                    ? `<audio controls autoplay> <source src='${item.audio}' type="audio/mpeg"> </audio>`
                    : `[sound:${item.question.split(' ').join('-')}.wav]`
                : '',
            Example: item.example,
            Definition: item.definition,
            Pronunciation: item.pronunciation,
            Image: item.image ? item.image : '',
        },
        tags: [date, 'Vocabulary', 'Vie - Eng'],
        options: {
            allowDuplicate: true,
        },
    };

    if (isAudio && type !== 'json') {
        result.audio = [
            {
                path: `${path}/audio/${item.question.split(' ').join('-')}.wav`,
                filename: `${item.question.split(' ').join('-')}.wav`,
                fields: ['Audio'],
            },
        ];
    }

    return result;
};

module.exports = { multipleChoice, EnglishToVietnamese, VietnameseToEnglish };
