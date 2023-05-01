// SPDX-License-Identifier: UNLICENSED

pragma solidity^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LinearVesting {
    using SafeERC20 for IERC20;

    IERC20 public token;
    mapping(address => uint256) public allocations;
    mapping(address => uint) public claimed;
    uint public startTime;
    uint public duration;

    constructor(IERC20 _token, address[] memory _beneficiaries, uint256[] memory _amounts, uint _startTime, uint _duration){
        token = _token;
        for(uint256 i=0; i < _beneficiaries.length; i++){
            allocations[_beneficiaries[i]] = _amounts[i];
        }
        startTime = _startTime;
        duration = _duration;
    }

    function claim() external {
        require(block.timestamp > startTime, "Linear Vesting has not yet started!");
        uint amount = _available(msg.sender);
        token.safeTransfer(msg.sender, amount);

        claimed[msg.sender] += amount;
    }

    function _available(address _address) internal view returns(uint){
        return _released(_address) - claimed[_address];
    }

   function _released(address address_) internal view returns (uint) {
     if (block.timestamp < startTime) {
         return 0;
    } else {
     if (block.timestamp > startTime + duration) {
          return allocations[address_];
     } else {
           return (allocations[address_] * (block.timestamp - startTime)) / duration;
     }
  }
}

    function available(address address_) external view returns (uint) {
         return _available(address_);
    }

    function released(address address_) external view returns (uint) {
        return _released(address_);
    }

    function outstanding(address address_) external view returns (uint) {
        return allocations[address_] - _released(address_);
    }
}