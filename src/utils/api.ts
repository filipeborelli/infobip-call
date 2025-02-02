import axios from 'axios';
export const getToken = async () => {
    const apiKey = "sua apikey aqui"
    const baseUrl = "seu base url aqui";
    let data = JSON.stringify({
        "identity": "Borelli",
        "displayName": "Filipe Borelli"
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://${baseUrl}.api.infobip.com/webrtc/1/token`,
        headers: {
            'Authorization': `App ${apiKey}`,
            'Content-Type': 'application/json'
        },
        data: data
    };

    return await axios.request(config)
        .then((response) => {
            return response.data;
        })
        .catch((error) => {
            return error;
        });
}