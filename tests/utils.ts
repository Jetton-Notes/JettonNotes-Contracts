import { Address, Cell, toNano } from "@ton/core";
import { Blockchain } from "@ton/sandbox";
import { jettonContentToCell, JettonMinter } from "../wrappers/Jetton/JettonMinter";

// Blockchain
export const BLOCKCHAIN_START_TIME: number = 1000;

// Jetton
export const INITIAL_JETTON_BALANCE: bigint = toNano('1000.00');

export function openContractJettonMinter(
    blockchain: Blockchain,
    jetton_sender_address: Address,
    jwallet_code: Cell,
    minter_code: Cell,
) {
    const defaultContent: Cell = jettonContentToCell({ type: 1, uri: 'https://some-url/content.json' });

    return blockchain.openContract(
        JettonMinter.createFromConfig(
            {
                admin: jetton_sender_address,
                content: defaultContent,
                wallet_code: jwallet_code,
            },
            minter_code,
        ),
    );
}
