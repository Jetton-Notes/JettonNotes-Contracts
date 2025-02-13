import { Blockchain, SandboxContract, TreasuryContract, SendMessageResult } from '@ton/sandbox';

import { Cell, toNano, beginCell, Address } from '@ton/core';

import { compile } from '@ton/blueprint';

import '@ton/test-utils';

import { JettonWallet } from '../wrappers/Jetton/JettonWallet';
import { JettonMinter } from '../wrappers/Jetton/JettonMinter';
import { BLOCKCHAIN_START_TIME, INITIAL_JETTON_BALANCE, openContractJettonMinter } from './utils';



describe("Jetton", () => {

    //Blockchain
    let blockchain: Blockchain;

    //Jetton
    let jetton_sender: SandboxContract<TreasuryContract>;
    let not_jetton_sender: SandboxContract<TreasuryContract>;
    let jetton_receiver: SandboxContract<TreasuryContract>;
    let not_jetton_receiver: SandboxContract<TreasuryContract>;

    let jettonUserWallet: (address: Address) => Promise<SandboxContract<JettonWallet>>;

    let jwallet_code: Cell;
    let minter_code: Cell;

    let jettonMinter: SandboxContract<JettonMinter>;

    let jetton_sender_jetton_wallet: SandboxContract<JettonWallet>;
    let not_jetton_sender_jetton_wallet: SandboxContract<JettonWallet>;
    let jetton_receiver_jetton_wallet: SandboxContract<JettonWallet>;



    beforeAll(async () => {
        jwallet_code = await compile("/Jetton/JettonWallet");
        minter_code = await compile("/Jetton/JettonMinter");
    })

    beforeEach(async () => {
        //Blockchain
        blockchain = await Blockchain.create();
        blockchain.now = BLOCKCHAIN_START_TIME;

        jetton_sender = await blockchain.treasury("jetton_sender");
        not_jetton_sender = await blockchain.treasury("not_jetton_sender");
        jetton_receiver = await blockchain.treasury("jetton_receiver");
        not_jetton_receiver = await blockchain.treasury("not_jetton_receiver");

        jettonMinter = openContractJettonMinter(blockchain, jetton_sender.address, jwallet_code, minter_code);

        jettonUserWallet = async (address: Address) => blockchain.openContract(JettonWallet.createFromAddress(await jettonMinter.getWalletAddress(address)));

        //Preparations: deploy jetton minter + set initial balance to jetton wallets and check it
        await jettonMinter.sendDeploy(jetton_sender.getSender(), toNano("1"));

        jetton_sender_jetton_wallet = await jettonUserWallet(jetton_sender.address);
        not_jetton_sender_jetton_wallet = await jettonUserWallet(not_jetton_sender.address);
        jetton_receiver_jetton_wallet = await jettonUserWallet(jetton_receiver.address);

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            jetton_sender.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        );

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            not_jetton_sender.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        )

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            jetton_receiver.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        );

        await jettonMinter.sendMint(
            jetton_sender.getSender(),
            not_jetton_receiver.address,
            INITIAL_JETTON_BALANCE,
            toNano("0.05"),
            toNano("1")
        );

        expect(await jetton_sender_jetton_wallet.getJettonBalance()).toBe(INITIAL_JETTON_BALANCE);
        expect(await jetton_receiver_jetton_wallet.getJettonBalance()).toBe(INITIAL_JETTON_BALANCE);
    })

    describe("transfers jettons", () => {
        it("transfer", async () => {
            expect(true).toBe(true)
        })
    })


})