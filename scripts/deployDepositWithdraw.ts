import { toNano } from '@ton/core';
import { DepositWithdraw } from '../wrappers/DepositWithdraw';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const depositWithdraw = provider.open(
        DepositWithdraw.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('DepositWithdraw')
        )
    );

    await depositWithdraw.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(depositWithdraw.address);

    console.log('ID', await depositWithdraw.getID());
}
