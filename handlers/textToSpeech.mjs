import sdk from 'microsoft-cognitiveservices-speech-sdk';

const textToSpeech = (text, path, subcriptionKey) => {
    return new Promise((resolve, reject) => {
        const subscriptionKey = subcriptionKey;
        const serviceRegion = 'southeastasia';
        const speechConfig = sdk.SpeechConfig.fromSubscription(
            subscriptionKey,
            serviceRegion
        );
        // /home/youngmarco/.config/Word2Card
        const audioConfig = sdk.AudioConfig.fromAudioFileOutput(
            `${path}/audio/${text.split(' ').join('-')}.wav`
        );

        const synthesizer = new sdk.SpeechSynthesizer(
            speechConfig,
            audioConfig
        );

        synthesizer.speakTextAsync(
            text,
            (result) => {
                if (
                    result.reason ===
                    sdk.ResultReason.SynthesizingAudioCompleted
                ) {
                    console.log(
                        `Audio synthesized to ${text.split(' ').join('-')}.wav`
                    );
                    resolve(`./audio/${text.split(' ').join('-')}.wav`);
                } else {
                    console.error(
                        'Speech synthesis canceled',
                        result.errorDetails
                    );
                    reject(new Error(result.errorDetails));
                }
                synthesizer.close();
            },
            (error) => {
                console.error('Error synthesizing', error);
                synthesizer.close();
                reject(error);
            }
        );
    });
};

export default textToSpeech;
