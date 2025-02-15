import { Address, toNano } from '@ton/core';
import { DepositWithdraw } from '../wrappers/DepositWithdraw';
import { compile, NetworkProvider } from '@ton/blueprint';

//TODO: Deploy on testnet

//TODO:

const JETTON_MASTER_ADDRESS = ""

export async function run(provider: NetworkProvider) {
    const sender = provider.sender()
    const address = sender.address as Address;
    const jetton_master_address = Address.parse(JETTON_MASTER_ADDRESS)
    const depositWithdraw = provider.open(
        DepositWithdraw.createFromConfig(
            {
                init: 0,
                jetton_wallet_address: jetton_master_address,
                jetton_wallet_set: 0,
                creator_address: address
            },
            await compile('DepositWithdraw')
        )
    );

    await depositWithdraw.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(depositWithdraw.address);

    console.log("Contract address: ", depositWithdraw.address);

    // console.log('ID', await depositWithdraw.getID());
    //TODO: Console log the contract address
}
