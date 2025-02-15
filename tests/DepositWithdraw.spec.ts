import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { depositJettonsForwardPayload, DepositWithdraw } from '../wrappers/DepositWithdraw';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { deposit, g1Compressed, g2Compressed, generateNoteWithdrawProof, hexToBigint, parseNote, SplitAddress } from '../lib/cryptonotes';



//@ts-ignore
import { buildBls12381, utils } from "ffjavascript";
import { JettonMinter } from '../wrappers/Jetton/JettonMinter';
import { JettonWallet } from '../wrappers/Jetton/JettonWallet';
import { BLOCKCHAIN_START_TIME, INITIAL_JETTON_BALANCE, openContractJettonMinter } from './utils';
const { unstringifyBigInts } = utils;



describe('DepositWithdraw', () => {

    //The code of the main contract
    let contract_code: Cell;


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

    let deployer: SandboxContract<TreasuryContract>;
    let depositWithdraw: SandboxContract<DepositWithdraw>;

    let depositWithdraw_Deploy: SendMessageResult;

    let deposit_contract_jetton_wallet: SandboxContract<JettonWallet>;


    beforeAll(async () => {
        contract_code = await compile('DepositWithdraw');
        jwallet_code = await compile("/Jetton/JettonWallet");
        minter_code = await compile("/Jetton/JettonMinter");
    });


    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = BLOCKCHAIN_START_TIME;

        deployer = await blockchain.treasury('deployer');
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

        depositWithdraw = blockchain.openContract(
            DepositWithdraw.createFromConfig(
                {
                    init: 0,
                    jetton_wallet_address: jettonMinter.address,//Jetton minter address,
                    jetton_wallet_set: 0,
                    creator_address: deployer.address
                },
                contract_code
            )
        );

        depositWithdraw_Deploy = await depositWithdraw.sendDeploy(deployer.getSender(), toNano('10'));

        expect(depositWithdraw_Deploy.transactions).toHaveTransaction({
            from: deployer.address,
            to: depositWithdraw.address,
            deploy: true,
            success: true,
        });

        // depositWithdraw --> jettonMinter (requesting our contract own jetton wallet)
        expect(depositWithdraw_Deploy.transactions).toHaveTransaction({
            from: depositWithdraw.address,
            to: jettonMinter.address,
            success: true,
        });

        deposit_contract_jetton_wallet = await jettonUserWallet(depositWithdraw.address);


    });

    describe("Deposits and withdraws", () => {

        let depositedAmount: bigint;
        let depositMessageResult: SendMessageResult;

        let forwardAmount: bigint;

        let depositData: Cell;

        let noteString: string;
        let parsedNote: any;

        beforeAll(async () => {
            depositedAmount = toNano("1");
            forwardAmount = toNano("1");
            noteString = await deposit({ currency: "tbtc", amount: 1 });
            parsedNote = await parseNote(noteString);
            depositData = depositJettonsForwardPayload({ commitment: parsedNote.deposit.commitment })
        })

        it("should do a jetton deposit and save the commitment", async () => {
            const balance_before_deposit = await jetton_sender_jetton_wallet.getJettonBalance();

            expect(balance_before_deposit).toBe(toNano("1000"))

            // const balance_of_deposit_contrac_before_deposit = await deposit_contract_jetton.getJettonBalance();

            depositMessageResult = await jetton_sender_jetton_wallet.sendTransfer(
                jetton_sender.getSender(),
                toNano("1.5"),
                depositedAmount,
                depositWithdraw.address, // Send to
                jetton_sender.address, //Response address
                beginCell().endCell(), //CustomPayload
                forwardAmount, //Must have enough Ton to forward it...
                depositData
            );

            let deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();

            expect(deposit_contract_balance).toBe(depositedAmount);

            expect(depositMessageResult.transactions).toHaveTransaction({
                from: jetton_sender.address,
                to: jetton_sender_jetton_wallet.address,
                success: true
            });

            //Check if it set it... 
            let dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);
            expect(dict.nullifier).toBe(0n);
            expect(dict.depositAmount).toBe(toNano("1"));

            const balance_after_deposit = await jetton_sender_jetton_wallet.getJettonBalance();
            expect(balance_after_deposit).toBe(toNano("999"));

            //Withdraw the deposit via ZKP

            const recipient_address = not_jetton_sender.address;
            const [workchain, splitRawAddress] = SplitAddress(recipient_address.toRawString());


            const recipient_bigint = hexToBigint(splitRawAddress);
            const { proof, publicSignals } = await generateNoteWithdrawProof(
                {
                    deposit: parsedNote.deposit,
                    recipient: recipient_bigint,
                    workchain: parseInt(workchain),
                    snarkArtifacts: undefined
                })
            const curve = await buildBls12381();
            const proofProc = unstringifyBigInts(proof);
            const pi_aS = g1Compressed(curve, proofProc.pi_a);
            const pi_bS = g2Compressed(curve, proofProc.pi_b);
            const pi_cS = g1Compressed(curve, proofProc.pi_c);
            const pi_a = Buffer.from(pi_aS, "hex");
            const pi_b = Buffer.from(pi_bS, "hex");
            const pi_c = Buffer.from(pi_cS, "hex");

            const verifyResult = await depositWithdraw.sendWithdraw(
                not_jetton_sender.getSender(),
                {
                    pi_a: pi_a,
                    pi_b: pi_b,
                    pi_c: pi_c,
                    pubInputs: publicSignals,
                    value: toNano("0.15") //0.15 TON fee
                });

            expect(verifyResult.transactions).toHaveTransaction({
                from: not_jetton_sender.address,
                to: depositWithdraw.address,
                success: true
            })

            deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();

            expect(deposit_contract_balance).toBe(toNano("0"));

            const withdrawn_value = await not_jetton_sender_jetton_wallet.getJettonBalance();

            expect(withdrawn_value).toBe(INITIAL_JETTON_BALANCE + toNano("1"));

            dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

            expect(dict.nullifier).toBe(parsedNote.deposit.nullifierHash);
            expect(dict.depositAmount).toBe(toNano("0"));

        })

        it("Makes a double deposit into the same commitment and withdraws", async function () {
            depositMessageResult = await jetton_sender_jetton_wallet.sendTransfer(
                jetton_sender.getSender(),
                toNano("1.5"),
                depositedAmount,
                depositWithdraw.address, // Send to
                jetton_sender.address, //Response address
                beginCell().endCell(), //CustomPayload
                forwardAmount, //Must have enough Ton to forward it...
                depositData
            );

            let deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();

            expect(deposit_contract_balance).toBe(depositedAmount);

            expect(depositMessageResult.transactions).toHaveTransaction({
                from: jetton_sender.address,
                to: jetton_sender_jetton_wallet.address,
                success: true
            });

            //Now I do another deposit, to the same commitment
            depositMessageResult = await jetton_sender_jetton_wallet.sendTransfer(
                jetton_sender.getSender(),
                toNano("1.5"),
                depositedAmount,
                depositWithdraw.address, // Send to
                jetton_sender.address, //Response address
                beginCell().endCell(), //CustomPayload
                forwardAmount, //Must have enough Ton to forward it...
                depositData
            );

            deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();
            // I deposited twice
            expect(deposit_contract_balance).toBe(depositedAmount * 2n);

            expect(depositMessageResult.transactions).toHaveTransaction({
                from: jetton_sender.address,
                to: jetton_sender_jetton_wallet.address,
                success: true
            });

            let dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

            expect(dict.nullifier).toBe(0n);
            expect(dict.depositAmount).toBe(toNano("2"));

            const recipient_address = not_jetton_sender.address;
            const [workchain, splitRawAddress] = SplitAddress(recipient_address.toRawString());


            const recipient_bigint = hexToBigint(splitRawAddress);
            const { proof, publicSignals } = await generateNoteWithdrawProof(
                {
                    deposit: parsedNote.deposit,
                    recipient: recipient_bigint,
                    workchain: parseInt(workchain),
                    snarkArtifacts: undefined
                })
            const curve = await buildBls12381();
            const proofProc = unstringifyBigInts(proof);
            const pi_aS = g1Compressed(curve, proofProc.pi_a);
            const pi_bS = g2Compressed(curve, proofProc.pi_b);
            const pi_cS = g1Compressed(curve, proofProc.pi_c);
            const pi_a = Buffer.from(pi_aS, "hex");
            const pi_b = Buffer.from(pi_bS, "hex");
            const pi_c = Buffer.from(pi_cS, "hex");

            const verifyResult = await depositWithdraw.sendWithdraw(
                not_jetton_sender.getSender(),
                {
                    pi_a: pi_a,
                    pi_b: pi_b,
                    pi_c: pi_c,
                    pubInputs: publicSignals,
                    value: toNano("0.15") //0.15 TON fee
                });

            expect(verifyResult.transactions).toHaveTransaction({
                from: not_jetton_sender.address,
                to: depositWithdraw.address,
                success: true
            })

            deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();

            expect(deposit_contract_balance).toBe(toNano("0"));

            const withdrawn_value = await not_jetton_sender_jetton_wallet.getJettonBalance();

            expect(withdrawn_value).toBe(INITIAL_JETTON_BALANCE + toNano("2"));

            dict = await depositWithdraw.getDeposit(parsedNote.deposit.commitment);

            expect(dict.nullifier).toBe(parsedNote.deposit.nullifierHash);
            expect(dict.depositAmount).toBe(toNano("0"));

            depositMessageResult = await jetton_sender_jetton_wallet.sendTransfer(
                jetton_sender.getSender(),
                toNano("1.5"),
                depositedAmount,
                depositWithdraw.address, // Send to
                jetton_sender.address, //Response address
                beginCell().endCell(), //CustomPayload
                forwardAmount, //Must have enough Ton to forward it...
                depositData
            );

            deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();
            // I deposited twice, the deposit is zero!
            expect(deposit_contract_balance).toBe(0n);

        })

        it("Makes a withdraw but consolidates utxos instead", async function () {
            //TODO: Test the UTXO

            //I need to make a deposit
            depositMessageResult = await jetton_sender_jetton_wallet.sendTransfer(
                jetton_sender.getSender(),
                toNano("1.5"),
                depositedAmount,
                depositWithdraw.address, // Send to
                jetton_sender.address, //Response address
                beginCell().endCell(), //CustomPayload
                forwardAmount, //Must have enough Ton to forward it...
                depositData
            );

            let deposit_contract_balance = await deposit_contract_jetton_wallet.getJettonBalance();

            expect(deposit_contract_balance).toBe(depositedAmount);

            expect(depositMessageResult.transactions).toHaveTransaction({
                from: jetton_sender.address,
                to: jetton_sender_jetton_wallet.address,
                success: true
            });


            //Then I transfer it to a new commitment and an utxo

            //TODO: I need to test transferring to existing one

            //TODO: test for errors            



        })


    })



});
