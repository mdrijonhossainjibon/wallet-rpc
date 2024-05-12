export interface History extends Document {
    uid: string;
    symbol: string;
    amount: number;
    blochain_key: string;
    tx: string;
    com: number;
    status: string;
}