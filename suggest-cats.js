require("dotenv").config();

const api = require('@actual-app/api');

const url = process.env.ACTUAL_SERVER_URL || '';
const password = process.env.ACTUAL_SERVER_PASSWORD || '';
const file_password = process.env.ACTUAL_FILE_PASSWORD || '';
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

const instructions = (categories) => {
    return {
      role: "system",
      content: 'You are a tool to automatically categorize transactions into one category, without providing any additional information or context.' +
      ' Responses do not need to be full sentences.' +
      ' Only respond with the category.' +
      ` These are the categories: ${categories}.`
    };
}

const categorize = (transaction) => {
    return { role: "user", content: transaction };
}

(async () => {
  console.log("connect");
  await api.init({ serverURL: url, password: password, dataDir: cache });

  console.log("open file");
  if (file_password) {
    await api.downloadBudget(sync_id, { password: file_password, });
  } else {  
    await api.downloadBudget(sync_id);
  }
  

  const res = await api.runQuery(
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

    console.log("get categories");
    let existing_categories = await api.getCategories();

    let categories = [];
    for (i = 0; i < existing_categories.length; i++){
      categories.push(existing_categories[i].name);
    }

    let messages = [];
    messages.push(instructions(categories.join(', ')));

    for (i = 0; i < res.data.length; i++) {
      console.log(`transaction: ${res.data[i].imported_payee}`);
      if (res.data[i].imported_payee) {
        messages.push(categorize(res.data[i].imported_payee))
        const response = await chat(messages);
        console.log(`response: ${response.choices[0].message.content}`);
        
        let newCategory = existing_categories.find(cat => cat.name === response.choices[0].message.content);
        if (newCategory) {
          await api.updateTransaction(res.data[i].id, { category: newCategory.id });
        }
        messages.pop();
      }
    }
  } else {
    console.log("no uncategorized transactions found");
  }

  console.log("done");
  await api.shutdown();
})();
