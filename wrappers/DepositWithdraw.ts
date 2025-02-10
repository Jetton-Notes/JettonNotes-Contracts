import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DepositWithdrawConfig = {
    id: number;
    counter: number;
};

export function depositWithdrawConfigToCell(config: DepositWithdrawConfig): Cell {
    return beginCell().storeUint(config.id, 32).storeUint(config.counter, 32).endCell();
}

export const Opcodes = {
    deposit: 0x3b3ca17,
    withdraw: 0x4b4ccb18,
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

    // async sendDeposit(provider: ContractProvider, via: Sender){}

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

    // async sendVerify(
    //     provider: ContractProvider,
    //     via: Sender,
    // opts: {
    //     pi_a: Buffer;
    //     pi_b: Buffer;
    //     pi_c: Buffer;
    //     pubInputs: bigint[];
    //     value: bigint;
    //     queryID?: number;
    // }
    // ) {
    //     await provider.internal(via, {
    //         value: opts.value,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         body: beginCell()
    //             .storeUint(Opcodes.verify, 32)
    //             .storeUint(opts.queryID ?? 0, 64)
    //             .storeRef(
    //                 beginCell()
    //                     .storeBuffer(opts.pi_a)
    //                     .storeRef(
    //                         beginCell()
    //                             .storeBuffer(opts.pi_b)
    //                             .storeRef(
    //                                 beginCell()
    //                                     .storeBuffer(opts.pi_c)
    //                                     .storeRef(
    //                                         this.cellFromInputList(opts.pubInputs)
    //                                     )
    //                             )
    //                     )
    //             )
    //             .endCell(),
    //     });
    // }

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

    // async sendIncrease(
    //     provider: ContractProvider,
    //     via: Sender,
    //     opts: {
    //         increaseBy: number;
    //         value: bigint;
    //         queryID?: number;
    //     }
    // ) {
    //     await provider.internal(via, {
    //         value: opts.value,
    //         sendMode: SendMode.PAY_GAS_SEPARATELY,
    //         body: beginCell()
    //             .storeUint(Opcodes.increase, 32)
    //             .storeUint(opts.queryID ?? 0, 64)
    //             .storeUint(opts.increaseBy, 32)
    //             .endCell(),
    //     });
    // }

    // async getCounter(provider: ContractProvider) {
    //     const result = await provider.get('get_counter', []);
    //     return result.stack.readNumber();
    // }

    // async getID(provider: ContractProvider) {
    //     const result = await provider.get('get_id', []);
    //     return result.stack.readNumber();
    // }

    // async getRes(provider: ContractProvider) {
    //     const result = await provider.get('get_res', []);
    //     return result.stack.readNumber();
    // }
}
