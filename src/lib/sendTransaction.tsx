import { API_CALL, TypeApiPromise } from "API_CALL";
import { Wallet, ethers } from "ethers";
import { CoinBalance, getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';
import { bech32 } from "bech32";
import { SuiKit } from '@scallop-io/sui-kit';

const abi = [
    "function transfer(address to, uint256 amount) returns (bool)"
];

 
export class sendTransaction {

    private wallet: any;
    private providerUrl;
    private provider;
    
    constructor(providerUrl: any, privateKey: string, decimals?: number) {
        this.providerUrl = providerUrl;
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.wallet  = new Wallet(privateKey, this.provider);
        
    }

    public async Transfer(to: string, value: string): Promise<TypeApiPromise> {
        const nonce = await this.provider.getTransactionCount(this.wallet.address);
        const gasPrice = await this.provider.getGasPrice();
        const gasLimit = 21000;
        const amountToSend = ethers.utils.parseEther(value);
        const chainId = (await this.provider.getNetwork()).chainId; // Fetch chain ID

        const tx: any = {
            nonce: ethers.utils.hexlify(nonce),
            gasPrice: ethers.utils.hexlify(gasPrice),
            gasLimit: ethers.utils.hexlify(gasLimit),
            to,
            value: ethers.utils.hexlify(amountToSend),
            chainId  // Include chain ID
        };

        const signedTx = await this.wallet.signTransaction(tx);
        const response = await API_CALL({
            baseURL: this.providerUrl,
            method: 'POST',
            data: {
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [signedTx],
                id: 1,
            }
        });

        return response;
    }
    private balance = (balance: CoinBalance) => {
        return Number.parseInt(balance.totalBalance) / Number(MIST_PER_SUI);
    };

    public async ERC20Transfer(to: string, value: string, contract: string) {
        const tokenContract = new ethers.Contract(contract, abi, this.provider).connect(this.wallet);
        const amountToSend = ethers.utils.parseUnits(value, 18); // Assuming 18 decimals, adjust accordingly
        const tx = await tokenContract.transfer(to, amountToSend);
        return tx;
    }

   

       
}



export class sendTransactionSui {
    private suiClient;
    private suiKit1;
    private decoded;
    private secretKeyBuffer;
    private secretKeyUint8Array;
    private keyPair;
   constructor (secretKey  : string ){
     this.suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
     this.suiKit1 = new SuiKit({ secretKey  });
     this.decoded = bech32.decode(secretKey);
     this.secretKeyBuffer = Buffer.from(bech32.fromWords(this.decoded.words));
     this.secretKeyUint8Array = new Uint8Array(this.secretKeyBuffer.slice(1));
     this.keyPair = Ed25519Keypair.fromSecretKey(this.secretKeyUint8Array);
   }



    public async SuiTransferToken(to: string, value: string , contract : string) : Promise<any> {
        try {

            

           return await this.suiKit1.transferCoin(to, Number(value) * Number(MIST_PER_SUI), contract)

        } catch (error: any) {
            console.log(`Transaction failed: ${error.message}`)
        }
    }

    public async SuiTransfer(to: string, value: string) {
        try {
            // Initialize the Sui client
            
            const tx = new TransactionBlock();

            // Split the coins
            const [coin] = tx.splitCoins(tx.gas, [tx.pure(Number(value) * Number(MIST_PER_SUI))]);

            // Transfer the coins to the recipient
            tx.transferObjects([coin], tx.pure(to));

            // Decode the private key using bech32
            
            

            // Convert the Buffer to Uint8Array
            
            

            // Sign and execute the transaction
            const response = await this.suiClient.signAndExecuteTransactionBlock({
                signer: this.keyPair,
                transactionBlock: tx
            });

            return response;
        } catch (error: any) {
            // Handle errors
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    public async API_CALLS({ baseURL }: { baseURL: string }): Promise<SuiTypes> {
        const response = await fetch(baseURL);
        const data = await response.json();
        return data as SuiTypes;
    }
}








interface TransactionEffects {
    status?: { status: string, error: string };
    gasUsed?: number;
    // Add other relevant properties
}

interface RawTransaction {
    result: {
        effects?: TransactionEffects;

    }

    // Add other properties for RawTransaction if needed
}

interface SuiTypes extends TypeApiPromise {
    rawTransaction?: RawTransaction;
}





