import net from 'net';

const hosts = ['127.0.0.1', '::1'];
const port = 3001;
let checked = 0;

for (const host of hosts) {
  const client = net.createConnection({ port, host }, () => {
    console.log(`Port ${port} is OPEN on ${host}`);
    client.end();
    checked++;
    if (checked === hosts.length) process.exit(0);
  });
  client.on('error', (err) => {
    console.log(`Port ${port} on ${host}: ${err.message}`);
    checked++;
    if (checked === hosts.length) process.exit(0);
  });
}
