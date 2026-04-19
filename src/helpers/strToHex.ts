const strToHex = (s: string) => Buffer.from(s, 'utf8').toString('hex');

export default strToHex;
