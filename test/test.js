const { expect } = require("chai");
const { ethers } = require("hardhat")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { time } = require('@openzeppelin/test-helpers');

describe("Linear Vesting", function(){
  it("should have a token", async()=>{
    const { Contract, Token } = await loadFixture(deploy)
    expect(await Contract.token()).to.eq(Token.address)
  })
  
  it('Should have a start time', async() => {
    const { Contract, startTime } = await loadFixture(deploy)
    expect(await Contract.startTime() ).to.eq(startTime)
  })

  it('Should have a duration', async() => {
    const { Contract, duration } = await loadFixture(deploy)
    expect(await Contract.duration()).to.eq(duration)
  })
})

describe("Claim", function(){
  it("Should revert when vesting not started", async function() {
    const{ Contract, benificiary } = await loadFixture(deploy)
    for await (const benifi of benificiary){
      expect(Contract.connect(benifi).claim()).to.be.revertedWith("Linear Vesting has not yet started")
    }
  })

  it("Should transfer available tokens", async()=>{
    const { Contract, Token, benificiary, amount, startTime, duration } = await loadFixture(deploy)
    await time.increaseTo(startTime);
    await time.increase((duration / 2) - 1); // 50%

    const allocation = amount[0]
    const amountValue = allocation.div(2) // 50%

    expect(Contract.connect(benificiary[0]).claim()).to.changeTokenBalances(Token, [Contract, benificiary[0]], 
      [Contract, allocation],
      [amountValue.mul(-1), amount])
  })

  it("Should update clamied tokens", async function (){
    const { Contract, Token, benificiary, amount, startTime, duration } = await loadFixture(deploy)
    await time.increaseTo(startTime)
    await time.increase((duration / 2) -1 );
    
    const allocation = amount[0]
    const amountValue = allocation.div(2)
    
    expect(await Contract.claimed(benificiary[0].address)).to.eq(0)
    await Contract.connect(benificiary[0]).claim()
    expect(await Contract.claimed(benificiary[0].address)).to.eq(amountValue)
  })
})

async function deploy(){
  const token = await ethers.getContractFactory("Token")
  const Token = await token.deploy("Test Token", "TST", ethers.utils.parseEther("10000"))
  await Token.deployed()

  const benificiary = await ethers.getSigners()
  const amount = benificiary.map((x, idx) => ethers.utils.parseEther((idx * 10).toString()))

  const startTime = (await time.latest()) + 60; // current + 60s
  const duration = 60 * 60 // 1 hour duration

  const contract = await ethers.getContractFactory("LinearVesting")
  // console.log(amount);
  const Contract = await contract.deploy(Token.address, benificiary.map(x => x.address), amount, startTime, duration) // sends signers instead of strings
  await Contract.deployed()

  // transfer of tokens 
  const TotalAmount = amount.reduce((acc, cur) => acc.add(cur), ethers.utils.parseEther('0'))
  await Token.transfer(Contract.address , TotalAmount)

  return {Contract, Token, benificiary, amount, startTime, duration}
}