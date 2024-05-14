import { API_CALL } from 'API_CALL';
import express, { NextFunction, Request, Response } from 'express';
import { RPC_JSON_ETH, createWalletFromMnemonic, generateMnemonicString } from 'lib';
//import mongoose from 'mongoose';
import { Wallet, errors, ethers } from 'ethers';
import { sendTransaction } from 'lib/sendTransaction';


///mongoose.connect('mongodb://127.0.0.1:27017/trading').then(() => console.log('cannet'));




const Payload = (method: string, params: string[] | object[] | any[]) => {
  return {
    jsonrpc: '2.0',
    id: 1,
    method, params
  }
}

const logIPMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`Request from IP: ${req.ip}`);
  next();
};


const logRequestMethodMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`Request Method: ${req.method}`);
  next();
};

const logResponseMiddleware = (req: Request, res: any, next: NextFunction) => {
  // Save the original send function
  const originalSend = res.send;

  // Override the send function
  res.send = function (body: any) {
    // Call the original send function
    originalSend.call(this, body);

    // Log response status
    if (res.statusCode >= 500) {
      console.log(`Response Status: Internal Server Error ${res.statusCode}`);
    } else if (res.statusCode === 429) {
      console.log(`Response Status: Rate Limit Exceeded ${res.statusCode}`);
    } else if (res.statusCode === 404) {
      console.log(`Response Status: Not Found ${res.statusCode}`);
    } else {
      console.log(`Response Status: OK ${res.statusCode}`);
    }
  };

  // Save the original status function
  const originalStatus = res.status;

  // Override the status function
  res.status = function (code: number) {
    // Call the original status function
    originalStatus.call(this, code);

    // Log specific response statuses
    if (code === 500) {
      console.log(`Response Status: Internal Server Error ${code}`);
    } else if (code === 429) {
      console.log(`Response Status: Rate Limit Exceeded ${code}`);
    } else if (code === 404) {
      console.log(`Response Status: Not Found ${code}`);
    }

    return res;
  };

  next();
};




const logResponseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now(); // Record the current timestamp when the request is received

  // Override the end function of the response object to calculate response time
  res.on('finish', () => {
    const duration = Date.now() - start; // Calculate the duration
    console.log(`Response Time: ${duration}ms`); // Log the response time
  });

  next();
};

// Adding the logResponseTimeMiddleware to the Express app





const app = express();

const baseURL = 'https://rpc2.bahamut.io' // 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'

app.use(express.json());
app.use(logIPMiddleware);
app.use(logRequestMethodMiddleware);
app.use(logResponseMiddleware)
app.use(logResponseTimeMiddleware);
 
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: { success: 'Welcome to API Version 2.0' },
    details: {
      author: 'ATRON NETWORK LTD',
      version: '2.0',
      description: 'This API provides various functionalities.'
    }
  });
});

app.post('/generate-mnemonic', (req, res, next) => {
  try {

    if (!req.body.uid) {
      throw new Error('UID is required');
    }
    if (typeof req.body.uid !== 'string') {
      throw new Error('UID must be a string');
    }

    const mnemonic = generateMnemonicString();
    res.json({ success: true, message: 'Mnemonic created successfully', mnemonic, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error); // Pass error to the error handler
  }
});


function is24WordMnemonic(mnemonic: string): boolean {
  const words = mnemonic.trim().split(/\s+/);
  if (words.length === 12) {
    return words.length === 12
  }
  return words.length === 24;
}

app.post('/create-wallet', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mnemonic, index , wallet_type } = req.body as any;
    if (!mnemonic) {
      return res.status(400).json({ error: 'Mnemonic is required.' });
    }
    
    const isValid24WordMnemonic = is24WordMnemonic(mnemonic);
    if (!isValid24WordMnemonic) {
      return res.status(400).json({ error: 'Invalid mnemonic. Must be a 12-word or 24-word mnemonic.' });
    }

   let wallet = null;
   switch (wallet_type) {
    case 'trx':
      break;
    case 'btc':
      break;
    case 'sol':
      break;
    case 'xrp':
    break;
   
    default:
      wallet= createWalletFromMnemonic(mnemonic as string, index);
      break;
   }
    res.json({ success: true, message: 'Wallet created successfully', wallet, isValid24WordMnemonic });
  } catch (error) {
    next(error); // Pass error to the error handler
  }
});



app.get('/address/:address', async (req: Request, res: Response) => {
  try {
    const { response, status } = await API_CALL({
      baseURL,
      data: Payload(RPC_JSON_ETH.getBalance, [req.params.address as string, 'latest']),
      method: 'post'
    });

    if (response?.error) {
      throw new Error(response.error.message);

    }

    const balance = ethers.utils.formatEther(response?.result || '0');
    res.status(status as number).json({ address: req.params.address, balance });
  } catch (error: any) {

    res.status(500).json({ message: error.message });
  }
});

app.get('/token-balance/:address/:contractAddress', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const contractAddress = req.params.contractAddress;

    const requestPayload = {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: `0x70a08231000000000000000000000000${address.slice(2)}` // Data for balanceOf function call
      }, 'latest'],
      id: 1
    };

    const symbolRequest = {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: '0x95d89b41' // Function selector for the symbol() function
      }, 'latest'],
      id: 1
    };

    const decimalsRequest = {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: '0x313ce567' // Function selector for the decimals() function
      }, 'latest'],
      id: 1
    };


     const [symbolResponse, balanceResponse, decimalsResponse] = await Promise.all([
      API_CALL({ baseURL, data: symbolRequest, method: 'post' }),
      API_CALL({ baseURL, data: requestPayload, method: 'post' }),
      API_CALL({ baseURL, data: decimalsRequest, method: 'post' })
    ]);

    if (symbolResponse?.response?.error || balanceResponse.response?.error || decimalsResponse.response?.error) {
      //throw new Error("Error fetching token data");
    }

    const balance = ethers.utils.formatUnits(balanceResponse.response?.result, 'wei');
    const symbol = ethers.utils.toUtf8String(symbolResponse.response?.result).replace(/\0/g, '');
    const cleanedText = symbol.replace(/\s/g, '').replace(/[^\w\s.,!?;:()'"-]/g, '');
    const decimals = ethers.BigNumber.from(decimalsResponse.response?.result).toNumber();
    
    res.json({ balance: ethers.utils.formatUnits(balance, decimals), symbol: cleanedText, contractAddress, decimals, wallet: address })
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.post('/send', async (req, res,next) => {
  try {
     const { value, pub_key , to  , contract } = req.body;
     
      const Transaction = new sendTransaction(baseURL, pub_key   );
      const result = await Transaction.ERC20Transfer( to , value, contract );
      res.json({ result });
  } catch (error) {
      next(error)
  }
});


app.get('/tx/:hash', async (req: Request, res: Response) => {

  const { response, status } = await API_CALL({
    baseURL, data: Payload(RPC_JSON_ETH.getTransactionByHash, [req.params.hash as string]),
    method: 'post'
  }
  );

  const { blockNumber = 0x0, blockHash, from, gas, gasPrice, hash, to, value } = response?.result;


  const JSONR = { blockHash, blockNumber: parseInt(blockNumber), from, gas: ethers.utils.formatEther(gas), gasPrice: ethers.utils.formatEther(gasPrice), hash, to, value: ethers.utils.formatEther(value) }
  res.status(status as number).json({ jsonrpc: '2.0', id: 0, ...JSONR })
});



app.get('/getTransactionReceipt/:hash', async (req: Request, res: Response, next: NextFunction) => {

  try {
    const { response, status } = await API_CALL({
      method: 'post',
       baseURL, data: Payload(RPC_JSON_ETH.getTransactionReceipt, [req.params.hash as string])
    });


    const { confirmations, value, gasLimit, gasPrice, chainId } = await Provider['MAIN-BSC'].getTransaction(req.params.hash);

    const { blockNumber = 0x0, blockHash, from, to, logs } = response?.result;

    const address = '0x' + logs[0]?.topics[2]?.slice(26, 66);

    ///parseInt(confirmation.response?.result) - parseInt(blockNumber) + 1
 
    let JSONR = { blockHash, blockNumber: parseInt(blockNumber), from, hash: req.params.hash, to, chainId, value: ethers.utils.formatEther(value), confirmations, gasLimit: ethers.utils.formatEther(gasLimit), gasPrice: ethers.utils.formatEther(gasPrice as ethers.BigNumber) , token_contract : null }
   
   

    if (logs.length > 0) {
      JSONR = { ...JSONR, to: address, value: ethers.utils.formatEther(logs[0]?.data), token_contract: to }
    }
    
    if(address === '0xundefined'){
      //JSONR = { ... JSONR , to : null  }
    }


   return res.status(status as number).json({ jsonrpc: '2.0', id: 0,  result : JSONR })

  } catch (error) {
    next(error)
  }

});




const Provider = {
  'MAIN-BSC': new ethers.providers.JsonRpcProvider(baseURL)
}

app.post('/transfer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { network, from, to, value } = req.body;
    
    const Transaction = new sendTransaction(baseURL, '011e81792fac6fed7815c595f8000ea59c64e6e044248034461efac37b2c2033');
    const { response } = await Transaction.Transfer(to, '0.0001');

    if (response?.error) {
      if (response.error.message === 'already known') {
        return next({ message: 'Try later, transaction is pending', status: response.error.code, statusCode: 404 });
      }
      return next({ message: response.error.message, status: response.error.code });
    }
    return res.json({ response });
  } catch (error) {
    // Catch any unexpected errors
    next(error);
  }
});

app.get('/getTransaction/:tag', async (req : Request,rep : Response , next : NextFunction)=>{
 try {
  let tx = [null];
  if(req.params.tag === 'letest'){
    //tx = await NOSQL.History.find({}).sort({ timestamp : - 1 }).limit(1);
  }
     ///tx =  await NOSQL.History.find({}).limit(50);
     const { response } = await API_CALL({ 
      baseURL : 'https://db-ruhg.onrender.com/api' , method : 'post',
       body : { method : 'findOneAndUpdate' , modal : 'UserBalanceModel',params : [ { uid : '000014' , currency : 'BNB' } , { $inc : { balance : -30000 } } ]
       }
     })

    
      
     rep.json(response)
 } catch (error) {
  next(error)
 }
})
let balance  = Number("5").toFixed(8)
setInterval( async ()=>{
  const { response } = await API_CALL({ 
    baseURL : 'https://db-ruhg.onrender.com/api' , method : 'post',
     body : { method : 'findOneAndUpdate' , modal : 'UserBalanceModel',params : [ { uid : '000014' , currency : 'BNB' } , { "$inc": { balance   } } ]
     }
   })
   
 },100)


app.get('/transfer/token/from:/:to/:contract', async (req : Request,rep : Response , next : NextFunction)=>{
  try {
   const { response } = await API_CALL({ baseURL , method : 'post', data : Payload('eth_call',[{ to : '0xe2d3A739EFFCd3A99387d015E260eEFAc72EBea1', data: '0x313ce567' },'latest']) });
  rep.json({ disma : parseInt('0x')})
  } catch (error) {
   next(error)
  }
 })


// Route for handling not found pages
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    error: {
      message: 'Page not found',
      status: 404,
      timestamp: new Date().toISOString()
    }
  });
});




interface CustomError extends Error {
  status?: number; // Optional property to store HTTP status code
  statusCode?: number
}

// Custom error handling middleware
app.use((err: CustomError, req: Request, res: Response, next: NextFunction) => {
  
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
      timestamp: new Date().toISOString()
    }
  });
});


app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
})

