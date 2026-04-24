# Enhanced SocketCluster WebSocket Test Tool

A simple web-based tool for testing SocketCluster WebSocket connections with enhanced reliability and ping/pong monitoring.

## 📋 Quick Start

1. **Open the tool**: Open `index.html` in your web browser
2. **Configure connection**: Enter your server details
3. **Connect**: Click the "Connect" button
4. **Subscribe**: Add symbols and select market types
5. **Monitor**: Watch real-time messages in the log

### Controlled UAT Batch Test

- Open `load-test.html` for a small controlled batch run
- Default setup opens `10` SocketCluster connections
- Each connection emits `/api/v2/market/symbolInfo` once and records ack/error timing
- Guardrail in the page limits the connection count to `20`

## 🔧 Connection Settings

### Basic Settings

- **Hostname**: Your WebSocket server address (e.g., `tnhsvpro.nhsv.vn`)
- **Port**: Server port number (e.g., `443` for HTTPS, `80` for HTTP)
- **Path**: WebSocket endpoint path (e.g., `/ws/socketcluster/`)
- **Secure**: Check for `wss://` (HTTPS), uncheck for `ws://` (HTTP)

### Advanced Settings

- **Auto Reconnect**: Automatically reconnect if connection drops
- **Ping Interval**: How often to check connection health (default: 30000ms)
- **Ack Timeout**: How long to wait for server responses (default: 20000ms)

## 📺 Subscription Management

### Subscribe to Channels

1. **Enter symbols**: Type symbol names separated by commas (e.g., `VIX, HSX, ABC`)
2. **Select market types**:
   - ✅ `market.quote` - Price quotes
   - ✅ `market.bidoffer` - Bid/offer data
   - ✅ `market.quote.dr` - Quote DR
   - ✅ `market.bidoffer.dr` - Bid/offer DR
3. **Click Subscribe**: Start receiving data

### View Active Subscriptions

- Check the "Active Subscriptions" section to see current channels
- Each subscription shows as: `1. market.quote.VIX`

### Unsubscribe Options

- **Unsubscribe**: Remove specific symbols (enter symbols first)
- **Unsubscribe All**: Remove all active subscriptions at once

## 📤 Publishing Messages

### Send Messages

1. **Choose target**:
   - Leave "Channel" empty to publish to all subscribed channels
   - Or enter specific channel name (e.g., `market.quote.VIX`)
2. **Enter message**: JSON format in the text area
3. **Click Publish**: Send the message

### Example Message

```json
{
  "message": "Hello from client",
  "timestamp": "2024-01-01T00:00:00Z",
  "user": "test-client",
  "data": {
    "test": true,
    "version": "1.0"
  }
}
```

## 📊 Connection Status

### Status Indicators

- 🔴 **Red dot**: Disconnected
- 🟡 **Yellow dot** (pulsing): Connecting/Reconnecting
- 🟢 **Green dot**: Connected

### Connection Info

- **Socket ID**: Unique connection identifier
- **Authentication**: Shows if logged in
- **Connection state**: Current status

## 📝 Message Log

### Log Features

- **Auto-scroll**: Automatically scroll to newest messages (can be disabled)
- **Clear Messages**: Remove all log entries
- **Export Log**: Save log to a text file
- **Message Types**: Different icons for different message types:
  - 📋 Info
  - ✅ Success
  - ❌ Error
  - ⚠️ Warning
  - 🔗 Connection
  - 📺 Subscription
  - 💬 Data Message

### Reading Messages

- **Timestamp**: When the event occurred
- **Type**: What kind of message (connection, subscription, data, etc.)
- **Content**: The actual message or data

## 🔍 Troubleshooting

### Connection Issues

- **"Server ping timed out"**: The tool automatically handles server pings, no action needed
- **Can't connect**: Check hostname, port, and path settings
- **Keeps disconnecting**: Enable auto-reconnect and check network stability

### Subscription Issues

- **No messages**: Verify symbol names and market types are correct
- **Subscription failed**: Check the message log for specific error details
- **Wrong data**: Confirm you're subscribed to the correct channels

### Performance

- **Too many messages**: Use "Clear Messages" button to improve performance
- **Slow response**: Check ping interval setting (minimum 5000ms recommended)

## 💡 Tips

### Best Practices

1. **Start simple**: Connect first, then add subscriptions
2. **Monitor ping/pong**: Look for 🏓 messages to confirm healthy connection
3. **Use auto-reconnect**: Enable for production testing
4. **Export logs**: Save important session data before closing

### Common Workflows

1. **Basic testing**: Connect → Subscribe to one symbol → Watch messages
2. **Multi-symbol**: Connect → Subscribe to multiple symbols → Monitor all channels
3. **Publishing**: Connect → Subscribe → Send test messages → Verify delivery

## 🛠️ Technical Notes

- **Library**: Uses SocketCluster v14.2.1 (local files)
- **Codec**: sc-codec-min-bin for message compression
- **Browser**: Modern browsers with WebSocket support
- **Network**: Works with both HTTP and HTTPS connections

## 📞 Support

If you encounter issues:

1. Check the message log for error details
2. Verify server settings with your administrator
3. Try disabling browser extensions that might block WebSockets
4. Export the log file for troubleshooting

## 🚀 Deploy with GitHub Actions

This project is a static site, so it can be deployed directly to GitHub Pages with the workflow at `.github/workflows/deploy-pages.yml`.

### Setup once on GitHub

1. Push this folder to a GitHub repository
2. Open `Settings` → `Pages`
3. In `Build and deployment`, set `Source` to `GitHub Actions`

### Deploy flow

- Every push to the repository's default branch will trigger a Pages deployment
- You can also run the workflow manually from the `Actions` tab using `workflow_dispatch`
- The workflow copies the repository contents except `.git/` and `.github/`, uploads them as the Pages artifact, then publishes the site

### Site URL

After the first successful run, the site will usually be available at:

`https://<github-username>.github.io/<repository-name>/`

---

**Version**: Enhanced WebSocket Test Tool with Ping/Pong Monitoring  
**Compatibility**: SocketCluster v14.x servers
