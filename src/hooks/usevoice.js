export const useVoice = (onResult, setIsListeningUI) => {
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Please use Chrome for Voice support.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => setIsListeningUI(true);

        recognition.onend = () => setIsListeningUI(false);

        recognition.onerror = () => setIsListeningUI(false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };

        recognition.start();
    };

    return { startListening };
};