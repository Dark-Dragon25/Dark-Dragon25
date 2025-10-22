// --- CONFIGURAÇÕES DO USUÁRIO ---
const channelID = '3118778';
const readApiKey = '5G98VF8Y588PQDS5';
const authoritiesPhoneNumber = '5562000000000';

const thingSpeakUrl = `https://api.thingspeak.com/channels/${channelID}/feeds.json?api_key=${readApiKey}&results=50`;

// --- VARIÁVEIS GLOBAIS ---
let map;
let activeMarkers = {}; // Objeto para guardar os marcadores ativos no mapa
let infoWindow;
// Carrega a lista de alertas já dispensados da "memória" do navegador.
let dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts')) || [];

// --- REFERÊNCIAS AOS ELEMENTOS DO HTML ---
const liveIndicator = document.getElementById('live-indicator');
const statusText = document.getElementById('status');
const activeAlertsValue = document.getElementById('active-alerts-value');
const latestLatValue = document.getElementById('latest-lat-value');
const latestLonValue = document.getElementById('latest-lon-value');
const alertList = document.getElementById('alert-list');

// Função principal de inicialização do mapa
function initMap() {
    const initialCoords = { lat: -16.4447, lng: -51.1162 };

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: initialCoords,
        styles: [ { elementType: "geometry", stylers: [{ color: "#242f3e" }] }, { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] }, { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }, { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] }, { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] }, { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] }, { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] }, { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] }, { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] }, { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] }, { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] }, { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] }, { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] }, { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] }, { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] }, { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }, { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] }, { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] } ],
    });

    infoWindow = new google.maps.InfoWindow();

    buscarNovosAlertas();
    setInterval(buscarNovosAlertas, 15000);
}

/**
 * NOVA FUNÇÃO AUXILIAR
 * Limpa todos os marcadores do mapa e os itens da lista na interface.
 */
function limparTela() {
    // Remove cada marcador do mapa
    for (const entryId in activeMarkers) {
        activeMarkers[entryId].setMap(null);
    }
    // Esvazia completamente o objeto de controle de marcadores
    activeMarkers = {};
    // Limpa a lista de alertas da interface
    alertList.innerHTML = '';
}

/**
 * FUNÇÃO ATUALIZADA
 * Busca os dados, limpa a tela e redesenha apenas os marcadores válidos.
 */
function buscarNovosAlertas() {
    fetch(thingSpeakUrl)
        .then(response => response.json())
        .then(data => {
            liveIndicator.classList.add('live');
            statusText.textContent = `Online - Atualizado às ${new Date().toLocaleTimeString()}`;

            // 1. Limpa o mapa e a lista antes de processar os novos dados
            limparTela();

            if (data.feeds && data.feeds.length > 0) {
                // 2. Processa cada alerta recebido
                data.feeds.forEach(feed => {
                    const entryId = parseInt(feed.entry_id);
                    const hasCoordinates = feed.field1 && feed.field2;
                    
                    // 3. Adiciona o marcador APENAS se tiver coordenadas E NÃO estiver na lista de dispensados
                    if (hasCoordinates && !dismissedAlerts.includes(entryId)) {
                        adicionarMarcadorDeAlerta(feed);
                    }
                });

                // Atualiza os campos de última localização com os dados do alerta mais recente
                const ultimoAlerta = data.feeds[data.feeds.length - 1];
                if (ultimoAlerta && ultimoAlerta.field1 && ultimoAlerta.field2) {
                    latestLatValue.textContent = parseFloat(ultimoAlerta.field1).toFixed(5);
                    latestLonValue.textContent = parseFloat(ultimoAlerta.field2).toFixed(5);
                }
            }

            // 4. Atualiza a contagem final de alertas ativos
            activeAlertsValue.textContent = Object.keys(activeMarkers).length;

            // 5. Se, no final, a lista estiver vazia, exibe a mensagem padrão
            if (alertList.children.length === 0) {
                alertList.innerHTML = '<li class="empty-log">Nenhum alerta recente.</li>';
            }
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
            statusText.textContent = 'Offline - Erro de conexão';
            liveIndicator.classList.remove('live');
        });
}


// Função para criar e adicionar um novo marcador (sem alterações)
function adicionarMarcadorDeAlerta(feed) {
    const lat = parseFloat(feed.field1);
    const lng = parseFloat(feed.field2);
    const entryId = parseInt(feed.entry_id);
    const timestamp = new Date(feed.created_at).toLocaleString('pt-BR');

    const customIcon = { path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z", fillColor: '#d9534f', fillOpacity: 1, strokeWeight: 1, strokeColor: '#ffffff', scale: 1.5, anchor: new google.maps.Point(0, -40) };
    const treeLabel = { text: '🌳', fontFamily: 'Arial', fontSize: '18px', color: '#ffffff' };

    const newMarker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: customIcon,
        label: treeLabel,
        title: `Alerta #${entryId} - ${timestamp}`,
        animation: google.maps.Animation.BOUNCE,
    });

    setTimeout(() => newMarker.setAnimation(null), 2100);

    const listItem = document.createElement('li');
    listItem.id = `alert-item-${entryId}`;
    listItem.innerHTML = `<div><span class="alert-id">Alerta #${entryId}</span></div><div class="alert-time">${timestamp}</div>`;
    listItem.onclick = () => {
        map.panTo({ lat, lng });
        newMarker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => newMarker.setAnimation(null), 2100);
    };
    alertList.prepend(listItem);

    const infoWindowContent = `
        <div style="color: #333; padding: 5px;">
            <h4>Alerta #${entryId}</h4><p><strong>Horário:</strong> ${timestamp}</p>
            <button onclick="dismissMarker(${entryId})" style="background-color: #f0ad4e; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">Aviso Falso</button>
            <button onclick="contactAuthorities(${lat}, ${lng})" style="background-color: #d9534f; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">Contatar Autoridades</button>
        </div>`;

    newMarker.addListener('click', () => {
        infoWindow.setContent(infoWindowContent);
        infoWindow.open(map, newMarker);
    });

    activeMarkers[entryId] = newMarker;
    map.panTo({ lat, lng });
}

// Função para remover um marcador (Aviso Falso) - sem alterações
function dismissMarker(entryId) {
    if (activeMarkers[entryId]) {
        activeMarkers[entryId].setMap(null);
        delete activeMarkers[entryId];
        infoWindow.close();

        // Adiciona o ID à lista de dispensados e salva na "memória" do navegador
        if (!dismissedAlerts.includes(entryId)) {
            dismissedAlerts.push(entryId);
            localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedAlerts));
        }

        const listItem = document.getElementById(`alert-item-${entryId}`);
        if (listItem) listItem.remove();

        activeAlertsValue.textContent = Object.keys(activeMarkers).length;
        if (alertList.children.length === 0) {
            alertList.innerHTML = '<li class="empty-log">Nenhum alerta recente.</li>';
        }
        console.log(`Alerta #${entryId} dispensado e salvo na memória.`);
    }
}

// Função para contatar autoridades (via WhatsApp) - sem alterações
function contactAuthorities(lat, lng) {
    const message = `ALERTA DE DESMATAMENTO DETECTADO! Possível atividade ilegal nas coordenadas: https://maps.google.com/?q=${lat},${lng}`;
    const whatsappUrl = `https://wa.me/${authoritiesPhoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}