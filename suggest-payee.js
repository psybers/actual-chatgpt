require("dotenv").config();

const api = require('@actual-app/api');

const url = process.env.ACTUAL_SERVER_URL || '';
const password = process.env.ACTUAL_SERVER_PASSWORD || '';
const sync_id = process.env.ACTUAL_SYNC_ID || '';
const cache = process.env.IMPORTER_CACHE_DIR || './cache';

if (!url || !password || !sync_id) {
  console.error('Required settings for Actual not provided.');
  process.exit(1);
}

const openai_key = process.env.OPENAI_API_KEY || '';

if (!openai_key) {
  console.error('OpenAI API key missing.');
  process.exit(1);
}

const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: openai_key });

const chat = async (messages) => {
    return await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0,
      max_tokens: 500,
    });
};

const instructions = () => {
    return {
      role: "system",
      content: 'You are a tool to automatically suggest payee names for transactions, without providing any additional information or context.' +
        ' Responses do not need to be full sentences.' +
        ' Only respond with the suggested payee name.' +
        ' For example, if given the description "COSTCO WHSE #1285" you would respond with "Costco".'
    };
}

const payee = (transaction) => {
    return { role: "user", content: transaction };
}

(async () => {
  console.log("connect");
  await api.init({ serverURL: url, password: password, dataDir: cache });

  console.log("open file");
  await api.downloadBudget(sync_id);

  let res = await api.runQuery(
    api.q('transactions')
      .filter({
        'category': null,
        'transfer_id': null,
        'starting_balance_flag': false,
        'account.closed': false,
        'account.offbudget': false,
        'account.tombstone': false,
      })
      .select('*')
      .orderBy({ 'date': 'desc' })
  );

  if (res.data.length) {
    console.log(`${res.data.length} uncategorized transactions found`);

    let messages = [];
    messages.push(instructions());

    for (i = 0; i < res.data.length; i++) {
      console.log(`payee: ${res.data[i].imported_payee}`);
      messages.push(payee(res.data[i].imported_payee))
      messages.pop();
    }
  } else {
    console.log("no uncategorized transactions found");
  }

  let all_payees = await api.getPayees();

  let payees = [];
  for (i = 0; i < all_payees.length; i++){
    payees.push(all_payees[i].name);
  }
  console.log(payees.join(', '));

  res = await api.runQuery(
    api.q('transactions')
      .filter({
        'transfer_id': null,
        'starting_balance_flag': false,
        'account.closed': false,
        'account.offbudget': false,
        'account.tombstone': false,
      })
      .groupBy('payee')
      .select({ total: { $count: 'id' }, payee: 'payee.name' })
      .orderBy({ 'date': 'desc' })
  );

  if (res.data.length) {
    console.log(`${res.data.length} single transaction payees found`);

    let messages = [];
    messages.push(instructions());

    for (i = 0; i < res.data.length; i++) {
      console.log(`payee: ${res.data[i].imported_payee}`);
      messages.push(payee(res.data[i].imported_payee))
      messages.pop();
    }
  } else {
    console.log("no single transaction payees found");
  }

  console.log("done");
  await api.shutdown();
})();
