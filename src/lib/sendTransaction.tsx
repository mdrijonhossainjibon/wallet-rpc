import { API_CALL, TypeApiPromise } from "API_CALL";
import { Wallet, ethers } from "ethers";

const abi = [
    "function transfer(address to, uint256 amount) returns (bool)"
];

export class sendTransaction {

    private wallet: Wallet;
    private providerUrl;
    private provider;
    constructor(providerUrl: any, privateKey: string, decimals?: number) {
        this.providerUrl = providerUrl;
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.wallet = new Wallet(privateKey, this.provider);
    }

    public async Transfer(to: string, value: string): Promise<TypeApiPromise> {
        const nonce = await this.provider.getTransactionCount(this.wallet.address);
        const gasPrice = await this.provider.getGasPrice();
        const gasLimit = 21000;
        const amountToSend = ethers.utils.parseEther(value);
        const chainId = (await this.provider.getNetwork()).chainId; // Fetch chain ID
    
        const tx : any = {
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
    

    public async ERC20Transfer(to: string, value: string, contract: string) {
        const tokenContract = new ethers.Contract(contract, abi, this.provider).connect(this.wallet);
        const amountToSend = ethers.utils.parseUnits(value, 18); // Assuming 18 decimals, adjust accordingly
        const tx = await tokenContract.transfer(to, amountToSend);
        return tx;
    }
}
