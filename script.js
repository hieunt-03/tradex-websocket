// Enhanced SocketCluster Client Test Application
// Addresses auto-disconnection issues with improved connection management
// Compatible with SocketCluster v14.x API

class SocketClusterManager {
    constructor() {
        this.socket = null;
        this.currentSubscriptions = new Map();
        this.connectionAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeouts = [];
        this.pingInterval = null;
        this.lastPongReceived = Date.now();
        this.lastServerPingReceived = Date.now();

        // Load test state
        this.loadTestRunning = false;
        this.loadTestSubscriptions = new Map();
        this.loadTestMsgCount = new Map();
        this.loadTestTotalMessages = 0;
        this.loadTestStartTime = null;
        this.loadTestStatsInterval = null;
        this.loadTestLastMsgCount = 0;

        // DOM elements
        this.initDOMElements();
        this.initEventListeners();
        this.updateUIState(false);
        this.initializeDefaultPublishData();

        // Check library versions
        this.checkLibraryVersions();
    }

    checkLibraryVersions() {
        let scVersion = 'Unknown';
        let codecVersion = 'Unknown';

        if (typeof socketCluster !== 'undefined' && socketCluster.version) {
            scVersion = socketCluster.version;
        }

        if (typeof scCodecMinBin !== 'undefined') {
            codecVersion = 'Available';
        }

        this.logMessage(`SocketCluster Client v${scVersion}, Codec: ${codecVersion}`, 'info');
    }

    initDOMElements() {
        // Connection elements
        this.hostnameInput = document.getElementById('hostname');
        this.portInput = document.getElementById('port');
        this.pathInput = document.getElementById('path');
        this.secureCheckbox = document.getElementById('secure');
        this.autoReconnectCheckbox = document.getElementById('autoReconnect');
        this.pingIntervalInput = document.getElementById('pingInterval');
        this.ackTimeoutInput = document.getElementById('ackTimeout');

        this.connectBtn = document.getElementById('connectBtn');
        this.disconnectBtn = document.getElementById('disconnectBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusDot = document.getElementById('statusDot');
        this.connectionInfo = document.getElementById('connectionInfo');

        // Subscription elements
        this.symbolInput = document.getElementById('symbolInput');
        this.marketQuoteCheckbox = document.getElementById('marketQuoteCheckbox');
        this.marketBidofferCheckbox = document.getElementById('marketBidofferCheckbox');
        this.marketQuoteDrCheckbox = document.getElementById('marketQuoteDrCheckbox');
        this.marketBidofferDrCheckbox = document.getElementById('marketBidofferDrCheckbox');
        this.subscribeBtn = document.getElementById('subscribeBtn');
        this.unsubscribeBtn = document.getElementById('unsubscribeBtn');
        this.unsubscribeAllBtn = document.getElementById('unsubscribeAllBtn');
        this.subscriptionsList = document.getElementById('subscriptionsList');

        // Load test elements
        this.loadTestCodesInput = document.getElementById('loadTestCodes');
        this.loadTestStartBtn = document.getElementById('loadTestStartBtn');
        this.loadTestStopBtn = document.getElementById('loadTestStopBtn');
        this.loadTestStatsDiv = document.getElementById('loadTestStats');
        this.statTotalChannels = document.getElementById('statTotalChannels');
        this.statTotalMessages = document.getElementById('statTotalMessages');
        this.statMsgPerSec = document.getElementById('statMsgPerSec');
        this.statElapsedTime = document.getElementById('statElapsedTime');
        this.channelStatsBody = document.getElementById('channelStatsBody');

        // OTP test elements
        this.otpAccountNoInput = document.getElementById('otpAccountNo');
        this.otpSubscriptionIdInput = document.getElementById('otpSubscriptionId');
        this.otpChannelPreviewInput = document.getElementById('otpChannelPreview');
        this.registerOtpBtn = document.getElementById('registerOtpBtn');

        // Publishing elements
        this.publishChannelInput = document.getElementById('publishChannel');
        this.publishDataInput = document.getElementById('publishData');
        this.publishBtn = document.getElementById('publishBtn');

        // Message elements
        this.messagesDiv = document.getElementById('messages');
        this.autoScrollCheckbox = document.getElementById('autoScrollCheckbox');
        this.clearMessagesBtn = document.getElementById('clearMessagesBtn');
        this.exportLogBtn = document.getElementById('exportLogBtn');
    }

    initEventListeners() {
        // Connection events
        this.connectBtn.addEventListener('click', () => this.connect());
        this.disconnectBtn.addEventListener('click', () => this.disconnect());

        // Subscription events
        this.subscribeBtn.addEventListener('click', () => this.subscribe());
        this.unsubscribeBtn.addEventListener('click', () => this.unsubscribe());
        this.unsubscribeAllBtn.addEventListener('click', () => this.unsubscribeAll());
        this.loadTestStartBtn.addEventListener('click', () => this.startLoadTest());
        this.loadTestStopBtn.addEventListener('click', () => this.stopLoadTest());
        this.registerOtpBtn.addEventListener('click', () => this.registerOtpChannel());
        this.otpAccountNoInput.addEventListener('input', () => this.updateOtpChannelPreview());
        this.otpSubscriptionIdInput.addEventListener('input', () => this.updateOtpChannelPreview());

        // Publishing events
        this.publishBtn.addEventListener('click', () => this.publish());

        // Utility events
        this.clearMessagesBtn.addEventListener('click', () => this.clearMessages());
        this.exportLogBtn.addEventListener('click', () => this.exportLog());

        // Input validation
        this.pingIntervalInput.addEventListener('input', this.validatePingInterval.bind(this));
        this.ackTimeoutInput.addEventListener('input', this.validateAckTimeout.bind(this));
    }

    initializeDefaultPublishData() {
        this.publishDataInput.value = JSON.stringify({
            message: "Hello from SocketCluster client",
            timestamp: new Date().toISOString(),
            user: "test-client",
            data: {
                test: true,
                version: "1.0"
            }
        }, null, 2);

        this.updateOtpChannelPreview();
    }

    buildOtpChannelName() {
        const accountNo = this.otpAccountNoInput.value.trim().toUpperCase();
        const subscriptionId = this.otpSubscriptionIdInput.value.trim().toUpperCase();
        if (!accountNo || !subscriptionId) {
            return '';
        }
        return `${accountNo}_${subscriptionId}`;
    }

    updateOtpChannelPreview() {
        this.otpChannelPreviewInput.value = this.buildOtpChannelName();
    }

    validatePingInterval() {
        const value = parseInt(this.pingIntervalInput.value);
        if (value < 5000) {
            this.pingIntervalInput.value = '5000';
            this.logMessage('Warning: Ping interval set to minimum value of 5000ms');
        }
    }

    validateAckTimeout() {
        const value = parseInt(this.ackTimeoutInput.value);
        if (value < 5000) {
            this.ackTimeoutInput.value = '5000';
            this.logMessage('Warning: Ack timeout set to minimum value of 5000ms');
        }
    }

    logMessage(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const typePrefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'connection': '🔗',
            'subscription': '📺',
            'message': '💬'
        }[type] || '📋';

        const logEntry = `[${time}] ${typePrefix} ${message}\n`;
        this.messagesDiv.textContent += logEntry;

        if (this.autoScrollCheckbox.checked) {
            this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
        }
    }

    updateConnectionInfo(info) {
        this.connectionInfo.textContent = info;
    }

    updateStatusIndicator(status) {
        this.statusDot.className = 'status-dot';
        if (status === 'connected') {
            this.statusDot.classList.add('connected');
        } else if (status === 'connecting') {
            this.statusDot.classList.add('connecting');
        }
    }

    updateSubscriptionsList() {
        if (this.currentSubscriptions.size === 0) {
            this.subscriptionsList.textContent = 'No active subscriptions';
        } else {
            const subscriptions = Array.from(this.currentSubscriptions.keys())
                .map((channel, index) => `${index + 1}. ${channel}`)
                .join('\n');
            this.subscriptionsList.textContent = subscriptions;
        }
    }

    updateUIState(isConnected) {
        // Connection buttons
        this.connectBtn.disabled = isConnected;
        this.disconnectBtn.disabled = !isConnected;

        // Connection inputs
        this.hostnameInput.disabled = isConnected;
        this.portInput.disabled = isConnected;
        this.pathInput.disabled = isConnected;
        this.secureCheckbox.disabled = isConnected;
        this.autoReconnectCheckbox.disabled = isConnected;
        this.pingIntervalInput.disabled = isConnected;
        this.ackTimeoutInput.disabled = isConnected;

        // Subscription controls
        this.subscribeBtn.disabled = !isConnected;
        this.symbolInput.disabled = !isConnected;
        this.marketQuoteCheckbox.disabled = !isConnected;
        this.marketBidofferCheckbox.disabled = !isConnected;
        this.registerOtpBtn.disabled = !isConnected;
        this.otpAccountNoInput.disabled = !isConnected;
        this.otpSubscriptionIdInput.disabled = !isConnected;

        // Load test controls
        this.loadTestStartBtn.disabled = !isConnected || this.loadTestRunning;
        this.loadTestStopBtn.disabled = !this.loadTestRunning;
        this.loadTestCodesInput.disabled = this.loadTestRunning;

        // Unsubscribe/Publish controls
        const hasSubscriptions = this.currentSubscriptions.size > 0;
        this.unsubscribeBtn.disabled = !isConnected || !hasSubscriptions;
        this.unsubscribeAllBtn.disabled = !isConnected || !hasSubscriptions;
        this.publishBtn.disabled = !isConnected;

        this.updateSubscriptionsList();
    }

    registerSubscription(channelName) {
        if (this.currentSubscriptions.has(channelName)) {
            this.logMessage(`Already subscribed to ${channelName}, skipping`, 'warning');
            return this.currentSubscriptions.get(channelName);
        }

        const subscription = this.socket.subscribe(channelName, { data: { returnSnapShot: true } });
        this.currentSubscriptions.set(channelName, subscription);
        this.logMessage(`✅ Subscribed to ${channelName}`, 'success');

        subscription.watch((data) => {
            if (this.currentSubscriptions.has(channelName)) {
                this.logMessage(`📦 [${channelName}] ${JSON.stringify(data)}`, 'message');
            }
        });

        subscription.on('subscribeFail', (error) => {
            this.logMessage(`Subscription failed for ${channelName}: ${error.message || error}`, 'error');
            this.currentSubscriptions.delete(channelName);
            this.updateUIState(true);
        });

        this.updateUIState(true);
        return subscription;
    }

    setupPingPong() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        const pingIntervalMs = parseInt(this.pingIntervalInput.value) || 30000;
        this.lastPongReceived = Date.now();
        this.lastServerPingReceived = Date.now();

        // Monitor server ping activity and respond appropriately
        this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.state === 'open') {
                const now = Date.now();
                const timeSinceLastServerPing = now - this.lastServerPingReceived;
                const timeSinceLastPong = now - this.lastPongReceived;
                const pingTimeout = pingIntervalMs * 4; // Very generous timeout

                // Check if we haven't received any server pings in a long time
                if (timeSinceLastServerPing > pingTimeout && timeSinceLastPong > pingTimeout) {
                    this.logMessage(`No server ping activity for ${timeSinceLastServerPing}ms, connection may be dead`, 'warning');

                    // Force reconnection if auto-reconnect is enabled
                    if (this.autoReconnectCheckbox.checked && this.socket) {
                        this.logMessage('Forcing reconnection due to server ping timeout', 'warning');
                        this.socket.disconnect();
                        return;
                    }
                }

                // Send a lightweight ping only occasionally to test connection
                // Most servers handle their own ping/pong, so we'll be less aggressive
                if (Math.random() < 0.3) { // Only ping 30% of the time
                    try {
                        this.socket.emit('#ping', {
                            timestamp: now,
                            client: 'test-client',
                            type: 'client-ping'
                        });
                        this.logMessage('Client ping sent', 'connection');
                    } catch (error) {
                        this.logMessage(`Client ping failed: ${error.message}`, 'error');
                    }
                }
            }
        }, pingIntervalMs);
    }

    clearReconnectTimeouts() {
        this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
        this.reconnectTimeouts = [];
    }

    autoSubscribeDefaultChannels() {
        const defaultChannels = ['market.refreshData', 'market.status'];

        this.logMessage(`Auto-subscribing to default channels: ${defaultChannels.join(', ')}`, 'subscription');

        defaultChannels.forEach(channelName => {
            if (this.currentSubscriptions.has(channelName)) {
                this.logMessage(`Already subscribed to ${channelName}, skipping`, 'warning');
                return;
            }

            try {
                const subscription = this.socket.subscribe(channelName, { data: { returnSnapShot: true } });
                this.currentSubscriptions.set(channelName, subscription);

                this.logMessage(`✅ Auto-subscribed to ${channelName}`, 'success');

                // Listen for messages on this channel
                subscription.watch((data) => {
                    if (this.currentSubscriptions.has(channelName)) {
                        this.logMessage(`📦 [${channelName}] ${JSON.stringify(data)}`, 'message');
                    }
                });

                // Handle subscription failures
                subscription.on('subscribeFail', (error) => {
                    this.logMessage(`Auto-subscription failed for ${channelName}: ${error.message || error}`, 'error');
                    this.currentSubscriptions.delete(channelName);
                    this.updateUIState(true);
                });

            } catch (error) {
                this.logMessage(`❌ Failed to auto-subscribe to ${channelName}: ${error.message}`, 'error');
            }
        });

        // Update UI to reflect new subscriptions
        this.updateUIState(true);
    }

    async connect() {
        const hostname = this.hostnameInput.value.trim();
        const port = parseInt(this.portInput.value, 10);
        const path = this.pathInput.value.trim();
        const secure = this.secureCheckbox.checked;
        const autoReconnect = this.autoReconnectCheckbox.checked;
        const pingInterval = parseInt(this.pingIntervalInput.value) || 30000;
        const ackTimeout = parseInt(this.ackTimeoutInput.value) || 20000;

        if (!hostname || !port) {
            this.logMessage('Error: Hostname and Port are required.', 'error');
            return;
        }

        const wsUrl = `${secure ? 'wss' : 'ws'}://${hostname}:${port}${path}`;
        this.logMessage(`Attempting to connect to ${wsUrl}...`, 'connection');

        this.connectionStatus.textContent = 'Connecting...';
        this.updateStatusIndicator('connecting');
        this.updateConnectionInfo('Establishing connection...');

        // Disconnect previous socket if exists
        if (this.socket) {
            this.socket.disconnect();
        }

        // Clear any existing timeouts
        this.clearReconnectTimeouts();

        try {
            const options = {
                hostname,
                port,
                path,
                secure,
                codecEngine: typeof scCodecMinBin !== 'undefined' ? scCodecMinBin : undefined,
                autoConnect: true,
                autoReconnect,
                autoReconnectOptions: {
                    initialDelay: 2000,
                    randomness: 1000,
                    multiplier: 1.5,
                    maxDelay: 30000
                },
                ackTimeout,
                connectTimeout: Math.max(20000, pingInterval), // Connection timeout
                pingTimeoutDisabled: false, // Allow server ping timeout
                authTokenName: 'socketCluster.authToken'
            };

            this.socket = socketCluster.create(options);
            this.connectionAttempts = 0;

            // Setup event listeners
            this.setupSocketListeners();

        } catch (error) {
            this.logMessage(`Connection setup failed: ${error.message}`, 'error');
            this.connectionStatus.textContent = 'Failed';
            this.updateStatusIndicator('disconnected');
            this.updateUIState(false);
        }
    }

    setupSocketListeners() {
        // Connection success
        this.socket.on('connect', (status) => {
            this.connectionAttempts = 0;
            this.logMessage(`✅ Connected successfully! Socket ID: ${this.socket.id}`, 'success');
            this.connectionStatus.textContent = `Connected (ID: ${this.socket.id})`;
            this.updateStatusIndicator('connected');
            this.updateConnectionInfo(`Connected | State: ${this.socket.state}`);
            this.updateUIState(true);

            // Setup ping/pong mechanism
            this.setupPingPong();

            // Auto-subscribe to default channels
            this.autoSubscribeDefaultChannels();
        });

        // Handle server pings - CRITICAL: Respond to server pings to prevent timeout
        this.socket.on('#ping', (data) => {
            this.lastServerPingReceived = Date.now();
            this.logMessage('🏓 Server ping received, sending pong response', 'connection');
            try {
                this.socket.emit('#pong', data || {});
                this.logMessage('🏓 Pong sent to server successfully', 'connection');
            } catch (error) {
                this.logMessage(`❌ Failed to send pong to server: ${error.message}`, 'error');
            }
        });

        // Handle pong responses from server (for our client-initiated pings)
        this.socket.on('#pong', (data) => {
            this.lastPongReceived = Date.now();
            this.logMessage('Pong received from server', 'connection');
        });

        // Handle errors
        this.socket.on('error', (error) => {
            this.logMessage(`Connection Error: ${error.message || error}`, 'error');
            this.connectionStatus.textContent = 'Error';
            this.updateStatusIndicator('disconnected');
        });

        // Handle disconnection
        this.socket.on('disconnect', (code, reason) => {
            this.logMessage(`Disconnected from server. Code: ${code}, Reason: ${reason || 'Unknown'}`, 'warning');

            // Clear ping interval
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }

            if (this.autoReconnectCheckbox.checked && this.socket.autoReconnect) {
                this.connectionStatus.textContent = 'Reconnecting...';
                this.updateStatusIndicator('connecting');
                this.updateConnectionInfo('Attempting to reconnect...');
                this.logMessage('Auto-reconnection is enabled, attempting to reconnect...', 'connection');
            } else {
                this.connectionStatus.textContent = 'Disconnected';
                this.updateStatusIndicator('disconnected');
                this.updateConnectionInfo('Connection closed');
                this.updateUIState(false);
            }
        });

        // Handle connection close (permanent)
        this.socket.on('connectAbort', (code, reason) => {
            this.connectionAttempts++;
            this.logMessage(`Connection attempt ${this.connectionAttempts} aborted. Code: ${code}, Reason: ${reason || 'Unknown'}`, 'warning');

            if (this.connectionAttempts >= this.maxReconnectAttempts) {
                this.logMessage(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`, 'error');
                this.connectionStatus.textContent = 'Failed';
                this.updateStatusIndicator('disconnected');
                this.updateConnectionInfo('Connection failed permanently');

                // Clear ping interval
                if (this.pingInterval) {
                    clearInterval(this.pingInterval);
                    this.pingInterval = null;
                }

                // Clear subscriptions on permanent failure
                this.currentSubscriptions.clear();
                this.updateUIState(false);
            }
        });

        // Handle authentication events  
        this.socket.on('authenticate', (signedAuthToken) => {
            this.logMessage('Successfully authenticated', 'success');
            this.updateConnectionInfo(`Authenticated | Socket ID: ${this.socket.id}`);
        });

        this.socket.on('deauthenticate', (oldSignedAuthToken) => {
            this.logMessage('Deauthenticated', 'warning');
            this.updateConnectionInfo(`Not authenticated | Socket ID: ${this.socket.id}`);
        });

        // Handle subscription events
        this.socket.on('subscribe', (channelName) => {
            this.logMessage(`Server confirmed subscription to ${channelName}`, 'subscription');
        });

        this.socket.on('unsubscribe', (channelName) => {
            this.logMessage(`Server confirmed unsubscription from ${channelName}`, 'subscription');
        });
    }

    disconnect() {
        if (this.socket) {
            this.logMessage('Initiating disconnection...', 'connection');

            // Clear ping interval
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }

            // Clear reconnect timeouts
            this.clearReconnectTimeouts();

            // Disable auto-reconnect before disconnecting
            this.socket.autoReconnect = false;
            this.socket.disconnect();
        }
    }

    registerOtpChannel() {
        if (!this.socket || this.socket.state !== 'open') {
            this.logMessage('Error: Not connected to server', 'error');
            return;
        }

        const accountNo = this.otpAccountNoInput.value.trim();
        const subscriptionId = this.otpSubscriptionIdInput.value.trim();
        const channelName = this.buildOtpChannelName();

        if (!accountNo || !subscriptionId) {
            this.logMessage('Error: Account No and Subscription ID are required', 'error');
            return;
        }

        this.registerSubscription(channelName);

        this.socket.emit('otp-notification-register', {
            accountNo,
            subscriptionId,
            channel: channelName
        });

        this.logMessage(`📡 OTP register event sent for channel ${channelName}`, 'subscription');
    }

    async subscribe() {
        if (!this.socket || this.socket.state !== 'open') {
            this.logMessage('Error: Not connected to server', 'error');
            return;
        }

        const symbolString = this.symbolInput.value.trim();
        if (!symbolString) {
            this.logMessage('Error: Symbol(s) are required', 'error');
            return;
        }

        const symbols = symbolString.split(',').map(s => s.trim()).filter(s => s);
        if (symbols.length === 0) {
            this.logMessage('Error: Valid symbol(s) are required', 'error');
            return;
        }

        const isMarketQuoteChecked = this.marketQuoteCheckbox.checked;
        const isMarketBidofferChecked = this.marketBidofferCheckbox.checked;
        const isMarketQuoteDrChecked = this.marketQuoteDrCheckbox.checked;
        const isMarketBidofferDrChecked = this.marketBidofferDrCheckbox.checked;

        if (!isMarketQuoteChecked && !isMarketBidofferChecked && !isMarketQuoteDrChecked && !isMarketBidofferDrChecked) {
            this.logMessage('Error: At least one market type must be selected', 'error');
            return;
        }

        const channelsToSubscribe = [];
        for (const symbol of symbols) {
            if (isMarketQuoteChecked) {
                channelsToSubscribe.push(`${this.marketQuoteCheckbox.value}.${symbol}`);
            }
            if (isMarketBidofferChecked) {
                channelsToSubscribe.push(`${this.marketBidofferCheckbox.value}.${symbol}`);
            }
            if (isMarketQuoteDrChecked) {
                channelsToSubscribe.push(`${this.marketQuoteDrCheckbox.value}.${symbol}`);
            }
            if (isMarketBidofferDrChecked) {
                channelsToSubscribe.push(`${this.marketBidofferDrCheckbox.value}.${symbol}`);
            }
        }

        this.logMessage(`Subscribing to ${channelsToSubscribe.length} channel(s): ${channelsToSubscribe.join(', ')}`, 'subscription');

        let successCount = 0;
        let failureCount = 0;

        for (const channelName of channelsToSubscribe) {
            try {
                if (this.currentSubscriptions.has(channelName)) {
                    this.logMessage(`Already subscribed to ${channelName}, skipping`, 'warning');
                    continue;
                }
                this.registerSubscription(channelName);
                successCount++;
            } catch (error) {
                this.logMessage(`❌ Failed to subscribe to ${channelName}: ${error.message}`, 'error');
                failureCount++;
                this.currentSubscriptions.delete(channelName);
            }
        }

        this.logMessage(`Subscription complete: ${successCount} successful, ${failureCount} failed`, 'info');
        this.updateUIState(true);
    }

    async unsubscribe() {
        if (this.currentSubscriptions.size === 0) {
            this.logMessage('Error: No active subscriptions', 'error');
            return;
        }

        const symbolString = this.symbolInput.value.trim();
        if (!symbolString) {
            this.logMessage('Error: Symbol(s) are required for unsubscription', 'error');
            return;
        }

        const symbols = symbolString.split(',').map(s => s.trim()).filter(s => s);
        const isMarketQuoteChecked = this.marketQuoteCheckbox.checked;
        const isMarketBidofferChecked = this.marketBidofferCheckbox.checked;
        const isMarketQuoteDrChecked = this.marketQuoteDrCheckbox.checked;
        const isMarketBidofferDrChecked = this.marketBidofferDrCheckbox.checked;

        if (!isMarketQuoteChecked && !isMarketBidofferChecked && !isMarketQuoteDrChecked && !isMarketBidofferDrChecked) {
            this.logMessage('Error: At least one market type must be selected', 'error');
            return;
        }

        const channelsToUnsubscribe = [];
        for (const symbol of symbols) {
            if (isMarketQuoteChecked) {
                channelsToUnsubscribe.push(`${this.marketQuoteCheckbox.value}.${symbol}`);
            }
            if (isMarketBidofferChecked) {
                channelsToUnsubscribe.push(`${this.marketBidofferCheckbox.value}.${symbol}`);
            }
            if (isMarketQuoteDrChecked) {
                channelsToUnsubscribe.push(`${this.marketQuoteDrCheckbox.value}.${symbol}`);
            }
            if (isMarketBidofferDrChecked) {
                channelsToUnsubscribe.push(`${this.marketBidofferDrCheckbox.value}.${symbol}`);
            }
        }

        this.logMessage(`Unsubscribing from ${channelsToUnsubscribe.length} channel(s): ${channelsToUnsubscribe.join(', ')}`, 'subscription');

        let successCount = 0;
        let failureCount = 0;

        for (const channelName of channelsToUnsubscribe) {
            const subscription = this.currentSubscriptions.get(channelName);
            if (!subscription) {
                this.logMessage(`Not subscribed to ${channelName}, skipping`, 'warning');
                continue;
            }

            try {
                await subscription.unsubscribe();
                this.currentSubscriptions.delete(channelName);
                this.logMessage(`✅ Unsubscribed from ${channelName}`, 'success');
                successCount++;
            } catch (error) {
                this.logMessage(`❌ Failed to unsubscribe from ${channelName}: ${error.message}`, 'error');
                failureCount++;
            }
        }

        this.logMessage(`Unsubscription complete: ${successCount} successful, ${failureCount} failed`, 'info');
        this.updateUIState(true);
    }

    async unsubscribeAll() {
        if (this.currentSubscriptions.size === 0) {
            this.logMessage('No subscriptions to unsubscribe from', 'warning');
            return;
        }

        this.logMessage(`Unsubscribing from all ${this.currentSubscriptions.size} subscriptions...`, 'subscription');

        let successCount = 0;
        let failureCount = 0;

        for (const [channelName, subscription] of this.currentSubscriptions.entries()) {
            try {
                await subscription.unsubscribe();
                this.logMessage(`✅ Unsubscribed from ${channelName}`, 'success');
                successCount++;
            } catch (error) {
                this.logMessage(`❌ Failed to unsubscribe from ${channelName}: ${error.message}`, 'error');
                failureCount++;
            }
        }

        this.currentSubscriptions.clear();
        this.logMessage(`Unsubscribed from all channels: ${successCount} successful, ${failureCount} failed`, 'info');
        this.updateUIState(true);
    }

    async publish() {
        if (!this.socket || this.socket.state !== 'open') {
            this.logMessage('Error: Not connected to server', 'error');
            return;
        }

        let dataToPublish;
        try {
            dataToPublish = JSON.parse(this.publishDataInput.value);
        } catch (e) {
            this.logMessage('Error: Invalid JSON in publish data field', 'error');
            return;
        }
        console.log(dataToPublish);
        const customChannel = this.publishChannelInput.value.trim();
        let targetChannels = [];

        if (customChannel) {
            targetChannels = [customChannel];
        } else if (this.currentSubscriptions.size > 0) {
            targetChannels = Array.from(this.currentSubscriptions.keys());
        } else {
            this.logMessage('Error: No target channels. Either specify a channel or subscribe to channels first', 'error');
            return;
        }

        this.logMessage(`Publishing to ${targetChannels.length} channel(s): ${targetChannels.join(', ')}`, 'subscription');

        let successCount = 0;
        let failureCount = 0;
        let completedCount = 0;
        const totalChannels = targetChannels.length;

        for (const channelName of targetChannels) {
            try {
                // Use emit with callback to get server response
                // this.socket.emit('#publish', {
                //     channel: channelName,
                //     data: {
                //         headers: {
                //             "rid": "12312412123"
                //         },
                //         body: dataToPublish
                //     }
                // }, (error, response) => {
                //     completedCount++;

                //     if (error) {
                //         this.logMessage(`❌ Publish error for ${channelName}: ${error.message || error}`, 'error');
                //         failureCount++;
                //     } else {
                //         this.logMessage(`✅ Published to ${channelName}`, 'success');
                //         // Display server callback response
                //         if (response !== undefined) {
                //             this.logMessage(`📨 Server response for ${channelName}: ${JSON.stringify(response)}`, 'info');
                //         } else {
                //             this.logMessage(`📨 Server acknowledged publish to ${channelName} (no response data)`, 'info');
                //         }
                //         successCount++;
                //     }

                //     // Update final status when all publishes are complete
                //     if (completedCount === totalChannels) {
                //         this.logMessage(`📊 Publish summary: ${successCount} successful, ${failureCount} failed out of ${totalChannels} total`, 'info');
                //     }
                // });

                this.socket.emit(channelName, {
                    headers: {
                        "rid": "12312412123"
                    },
                    body: dataToPublish
                }, (error, response) => {
                    completedCount++;

                    if (error) {
                        this.logMessage(`❌ Publish error for ${channelName}: ${error.message || error}`, 'error');
                        failureCount++;
                    } else {
                        this.logMessage(`✅ Published to ${channelName}`, 'success');
                        // Display server callback response
                        if (response !== undefined) {
                            this.logMessage(`📨 Server response for ${channelName}: ${JSON.stringify(response)}`, 'info');
                        } else {
                            this.logMessage(`📨 Server acknowledged publish to ${channelName} (no response data)`, 'info');
                        }
                        successCount++;
                    }

                    // Update final status when all publishes are complete
                    if (completedCount === totalChannels) {
                        this.logMessage(`📊 Publish summary: ${successCount} successful, ${failureCount} failed out of ${totalChannels} total`, 'info');
                    }
                });
            } catch (error) {
                this.logMessage(`❌ Failed to publish to ${channelName}: ${error.message}`, 'error');
                failureCount++;
                completedCount++;

                // Check if this was the last one
                if (completedCount === totalChannels) {
                    this.logMessage(`📊 Publish summary: ${successCount} successful, ${failureCount} failed out of ${totalChannels} total`, 'info');
                }
            }
        }
    }

    // =============================================
    // LOAD TEST METHODS
    // =============================================

    startLoadTest() {
        if (!this.socket || this.socket.state !== 'open') {
            this.logMessage('Error: Not connected to server', 'error');
            return;
        }

        const codesText = this.loadTestCodesInput.value.trim();
        if (!codesText) {
            this.logMessage('Error: Nhập ít nhất 1 mã chứng khoán để load test', 'error');
            return;
        }

        // Parse codes: split by comma, space, newline, semicolon
        const codes = codesText
            .split(/[,;\s\n]+/)
            .map(c => c.trim().toUpperCase())
            .filter(c => c.length > 0);

        if (codes.length === 0) {
            this.logMessage('Error: Không tìm thấy mã hợp lệ', 'error');
            return;
        }

        // Remove duplicates
        const uniqueCodes = [...new Set(codes)];

        this.logMessage(`🚀 LOAD TEST: Bắt đầu với ${uniqueCodes.length} mã: ${uniqueCodes.join(', ')}`, 'info');

        // Reset state
        this.loadTestRunning = true;
        this.loadTestSubscriptions.clear();
        this.loadTestMsgCount.clear();
        this.loadTestTotalMessages = 0;
        this.loadTestLastMsgCount = 0;
        this.loadTestStartTime = Date.now();

        // Build all channel names
        const allChannels = [];
        for (const code of uniqueCodes) {
            allChannels.push(`market.quote.${code}`);
            allChannels.push(`market.bidoffer.${code}`);
        }

        this.logMessage(`📡 Subscribing ${allChannels.length} channels ĐỒNG THỜI...`, 'subscription');

        // Subscribe ALL channels at the SAME TIME (no await, no delay)
        const subscribeStartTime = performance.now();
        let successCount = 0;
        let failCount = 0;

        for (const channelName of allChannels) {
            try {
                const subscription = this.socket.subscribe(channelName, { data: { returnSnapShot: true } });
                this.loadTestSubscriptions.set(channelName, subscription);
                this.loadTestMsgCount.set(channelName, 0);

                // Watch for messages
                subscription.watch((data) => {
                    if (this.loadTestRunning) {
                        this.loadTestTotalMessages++;
                        const current = this.loadTestMsgCount.get(channelName) || 0;
                        this.loadTestMsgCount.set(channelName, current + 1);
                    }
                });

                subscription.on('subscribeFail', (error) => {
                    this.logMessage(`❌ Load test subscribe failed: ${channelName} - ${error.message || error}`, 'error');
                });

                successCount++;
            } catch (error) {
                this.logMessage(`❌ Failed to subscribe ${channelName}: ${error.message}`, 'error');
                failCount++;
            }
        }

        const subscribeTime = (performance.now() - subscribeStartTime).toFixed(2);
        this.logMessage(`✅ Subscribe hoàn tất trong ${subscribeTime}ms: ${successCount} thành công, ${failCount} thất bại`, 'success');

        // Show stats and start updating
        this.loadTestStatsDiv.style.display = 'block';
        this.statTotalChannels.textContent = successCount;

        // Update stats every second
        this.loadTestStatsInterval = setInterval(() => this.updateLoadTestStats(), 1000);

        this.updateUIState(true);
    }

    stopLoadTest() {
        if (!this.loadTestRunning) return;

        this.logMessage('⏹ LOAD TEST: Đang dừng...', 'info');

        // Stop stats update
        if (this.loadTestStatsInterval) {
            clearInterval(this.loadTestStatsInterval);
            this.loadTestStatsInterval = null;
        }

        // Unsubscribe all load test channels
        let unsubCount = 0;
        for (const [channelName, subscription] of this.loadTestSubscriptions.entries()) {
            try {
                subscription.unsubscribe();
                unsubCount++;
            } catch (error) {
                this.logMessage(`❌ Failed to unsubscribe ${channelName}: ${error.message}`, 'error');
            }
        }

        const elapsed = ((Date.now() - this.loadTestStartTime) / 1000).toFixed(1);
        const avgMsgPerSec = this.loadTestTotalMessages / Math.max(1, parseFloat(elapsed));

        this.logMessage(`📊 LOAD TEST KẾT QUẢ:`, 'info');
        this.logMessage(`   Thời gian chạy: ${elapsed}s`, 'info');
        this.logMessage(`   Tổng channels: ${this.loadTestSubscriptions.size}`, 'info');
        this.logMessage(`   Tổng messages: ${this.loadTestTotalMessages}`, 'info');
        this.logMessage(`   Trung bình: ${avgMsgPerSec.toFixed(1)} msg/s`, 'info');
        this.logMessage(`   Unsubscribed: ${unsubCount} channels`, 'info');

        this.loadTestRunning = false;
        this.loadTestSubscriptions.clear();

        this.updateUIState(this.socket && this.socket.state === 'open');
    }

    updateLoadTestStats() {
        if (!this.loadTestRunning) return;

        const elapsed = (Date.now() - this.loadTestStartTime) / 1000;
        const msgPerSec = this.loadTestTotalMessages - this.loadTestLastMsgCount;
        this.loadTestLastMsgCount = this.loadTestTotalMessages;

        // Update stat cards
        this.statTotalMessages.textContent = this.loadTestTotalMessages.toLocaleString();
        this.statMsgPerSec.textContent = msgPerSec.toLocaleString();

        // Format elapsed time
        const mins = Math.floor(elapsed / 60);
        const secs = Math.floor(elapsed % 60);
        this.statElapsedTime.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        // Update per-channel stats table
        let html = '';
        for (const [channel, count] of this.loadTestMsgCount.entries()) {
            html += `<div class="channel-stat-row">`;
            html += `<span class="channel-stat-name">${channel}</span>`;
            html += `<span class="channel-stat-count">${count.toLocaleString()}</span>`;
            html += `</div>`;
        }
        this.channelStatsBody.innerHTML = html;
    }

    clearMessages() {
        this.messagesDiv.textContent = '';
        this.logMessage('Message log cleared', 'info');
    }

    exportLog() {
        const logContent = this.messagesDiv.textContent;
        if (!logContent.trim()) {
            this.logMessage('No log content to export', 'warning');
            return;
        }

        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `socketcluster-log-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.logMessage('Log exported successfully', 'success');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.socketManager = new SocketClusterManager();
    window.socketManager.logMessage('Enhanced SocketCluster Client Test initialized', 'success');
    window.socketManager.logMessage('Features: Auto-reconnection, Ping/Pong monitoring, Enhanced error handling', 'info');
}); 