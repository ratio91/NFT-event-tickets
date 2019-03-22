var EventTicketSystem = artifacts.require("./EventTicketSystem.sol");

module.exports = function(deployer) {
  
  // define event parameters used for all tickets for a specific event
  let eventName = "MyConcert";
  let eventSymbol = "MC"
  let eventStartDate = 1594095567;
  let maxSupply = 100;
  let initialPrice = 1;
  let maxPriceMultiple = 2;
  let transferFee = 20;

  let initialPriceInWei = web3.utils.toWei(web3.utils.toBN(initialPrice));
  let d = new Date(eventStartDate*1000).toLocaleDateString("en-US");
  
  console.log('Deploying contract for event ',eventName,'(',eventSymbol,') on ',d);
  console.log('A maximum of',maxSupply,'tickets are available');
  console.log('The initial ticket price is',initialPrice,'ETH');
  console.log('Ticket prices are only allowed to be a factor of',maxPriceMultiple,'of the initial ticket price');
  console.log('The ticket transfer fee between attendees is set to ',transferFee,'% of the ticket price');    
  
  //deploy contract with parameters
  deployer.deploy(EventTicketSystem, eventName, eventSymbol, eventStartDate, maxSupply, initialPriceInWei, maxPriceMultiple, transferFee).then(() => {
    console.log('Deployed EventTicketSystem contract with address', EventTicketSystem.address);
  });
};