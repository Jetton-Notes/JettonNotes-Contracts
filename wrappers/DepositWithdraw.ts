import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, TupleBuilder } from '@ton/core';

export type DepositWithdrawConfig = {
    init: number;
    jetton_wallet_address: Address,
    jetton_wallet_set: number,
    creator_address: Address,
    exact_fee_amount: bigint
};

export function depositWithdrawConfigToCell(config: DepositWithdrawConfig): Cell {
    return beginCell()
        .storeBit(config.init)
        .storeAddress(config.jetton_wallet_address)
        .storeBit(config.jetton_wallet_set)
        .storeAddress(config.creator_address)
        .storeCoins(config.exact_fee_amount)
        .endCell();
}

export type DepositForwardPayload = {
    commitment: bigint
}

export function depositJettonsForwardPayload(config: DepositForwardPayload) {
    return beginCell()
        .storeUint(config.commitment, 256)
        .endCell()
}

export const Opcodes = {
    withdraw: 0x4b4ccb18,
    transfer_note: 0x5b5ccb29,
    set_fee_data: 0x6b6cc29,
    note_withdraw_to_external_with_utxo: 0x7b7cc20,
    note_withdraw_to_note_no_utxo: 0x8bdd30
};

export class DepositWithdraw implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new DepositWithdraw(address);
    }

    static createFromConfig(config: DepositWithdrawConfig, code: Cell, workchain = 0) {
        const data = depositWithdrawConfigToCell(config);
        const init = { code, data };
        return new DepositWithdraw(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        opts: {
            pi_a: Buffer;
            pi_b: Buffer;
            pi_c: Buffer;
            pubInputs: bigint[];
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdraw, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeRef(
                    beginCell()
                        .storeBuffer(opts.pi_a)
                        .storeRef(
                            beginCell()
                                .storeBuffer(opts.pi_b)
                                .storeRef(
                                    beginCell()
                                        .storeBuffer(opts.pi_c)
                                        .storeRef(
                                            this.cellFromInputList(opts.pubInputs)
                                        )
                                )
                        )
                ).endCell()
        })
    }


    async sendTransfer_note(
        provider: ContractProvider,
        via: Sender,
        opts: {
            pi_a: Buffer;
            pi_b: Buffer;
            pi_c: Buffer;
            pubInputs: bigint[];
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.transfer_note, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeRef(
                    beginCell()
                        .storeBuffer(opts.pi_a)
                        .storeRef(
                            beginCell()
                                .storeBuffer(opts.pi_b)
                                .storeRef(
                                    beginCell()
                                        .storeBuffer(opts.pi_c)
                                        .storeRef(
                                            this.cellFromInputList(opts.pubInputs)
                                        )
                                )
                        )
                )
                .endCell(),
        });
    }

    //This allows sending some HDWallet balance to an external wallet, but it must be pulled by the recipient and there is no relayer
    async sendNoteWithdrawToExternalWalletWithUtxo(
        provider: ContractProvider,
        via: Sender,
        opts: {
            pi_a: Buffer;
            pi_b: Buffer;
            pi_c: Buffer;
            pubInputs: bigint[];
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.note_withdraw_to_external_with_utxo, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeRef(
                    beginCell()
                        .storeBuffer(opts.pi_a)
                        .storeRef(
                            beginCell()
                                .storeBuffer(opts.pi_b)
                                .storeRef(
                                    beginCell()
                                        .storeBuffer(opts.pi_c)
                                        .storeRef(
                                            this.cellFromInputList(opts.pubInputs)
                                        )
                                )
                        )
                )
                .endCell(),
        });
    }

    //This allows withdrawing a note to another without utxo, for sweeping burner wallets into hd wallet
    //it uses a relayer
    async sendNoteWithdrawToNoteNoUtxo(
        provider: ContractProvider,
        via: Sender,
        opts: {
            pi_a: Buffer;
            pi_b: Buffer;
            pi_c: Buffer;
            pubInputs: bigint[];
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.note_withdraw_to_note_no_utxo, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeRef(
                    beginCell()
                        .storeBuffer(opts.pi_a)
                        .storeRef(
                            beginCell()
                                .storeBuffer(opts.pi_b)
                                .storeRef(
                                    beginCell()
                                        .storeBuffer(opts.pi_c)
                                        .storeRef(
                                            this.cellFromInputList(opts.pubInputs)
                                        )
                                )
                        )
                )
                .endCell(),
        });
    }


    async sendSet_fee_data(
        provider: ContractProvider,
        via: Sender, opts: {
            new_fee: bigint,
            value: bigint,
            queryID?: number
        }) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.set_fee_data, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeCoins(opts.new_fee).endCell()
        })
    }

    cellFromInputList(list: bigint[]): Cell {
        var builder = beginCell();
        builder.storeUint(list[0], 256);
        if (list.length > 1) {
            builder.storeRef(
                this.cellFromInputList(list.slice(1))
            );
        }
        return builder.endCell()
    }

    async getDeposit(provider: ContractProvider, commitmentHash: bigint) {
        const result = await provider.get("get_deposit", [{ type: "int", value: commitmentHash }])
        const nullifier = result.stack.readBigNumber();
        const depositAmount = result.stack.readBigNumber();

        return {
            nullifier, depositAmount
        }
    }

    async getRelayerData(provider: ContractProvider) {
        const result = await provider.get("get_relayer_data", []);
        const exact_fee_amount = result.stack.readBigNumber();

        return { exact_fee_amount }
    }
}

