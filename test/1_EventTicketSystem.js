var Ticket = artifacts.require("./EventTicketSystem.sol");
const truffleAssert = require('truffle-assertions');

contract('EventTicketSystem', function (accounts) {

    // initial params given to contructor
    const eventName = "MyConcert";
    const eventSymbol = "MC"
    const eventStartDate = 1594095567;
    const maxSupply = 100;
    const initialPrice = web3.utils.toWei(web3.utils.toBN(1));
    const maxPriceMultiple = 2;
    const transferFee = 20;

    // other vars used for testing
    const owner = accounts[0];
    const attendee1 = accounts[1];
    const attendee2 = accounts[2];
    const d = new Date(eventStartDate*1000).toLocaleDateString("en-US");
    const newPrice2 = web3.utils.toWei(web3.utils.toBN(2));
    const newPrice3 = web3.utils.toWei(web3.utils.toBN(3));

    // hook
    beforeEach('setup contract for each test', async () => {
        instance = await Ticket.new(eventName, eventSymbol, eventStartDate, maxSupply, initialPrice, maxPriceMultiple, transferFee);
    });

    // define a sample ticket to test functions
    const firstTicket = {
        id: 0,
        price: initialPrice,
        forSale: false,
        used: false
    };

/**
* @dev setup phase
*/
    // check if contract is correctly initialized (= unit test of getter functions)
    describe('when initialized', async () => {

        it("It should check if the contract is initialized", async () => {
            let instance = await Ticket.deployed();
        });

        it('it should have "'+eventName+'" as name', async () => {
            let name = await instance.name();
            assert.equal(name.valueOf(),eventName,'Wrong name');
        });

        it("It should have '"+eventSymbol+"' as symbol", async () => {
            let _symbol = await instance.symbol();
            assert.equal(_symbol.valueOf(), eventSymbol , `wrong symbol`);
        });

        it("It should have a valid eventStartDate of "+d, async () => {
            let _eventStartDate = await instance.eventStartDate();
            assert.equal(_eventStartDate.valueOf(), eventStartDate , `wrong eventStartDate`);
        });

        it("It should have a valid maxSupply of "+maxSupply, async () => {
            let _maxSupply = await instance.ticketSupply();
            assert.equal(_maxSupply.valueOf(), maxSupply , `wrong maxSupply`);
        });

        it("It should have a valid initialPrice of "+initialPrice, async () => {
            let _initialPrice = await instance.initialTicketPrice();
            assert.equal(_initialPrice.toString(10).valueOf(), initialPrice , `wrong initialPrice: ${_initialPrice.toString(10)}`);
        });

        it("It should have a valid maxPriceMultiple of "+maxPriceMultiple, async () => {
            let _maxPriceMultiple = await instance.maxPriceFactor();
            assert.equal(_maxPriceMultiple.valueOf(), maxPriceMultiple , `wrong maxPriceMultiple`);
        });

        it("It should have a valid transferFee of "+transferFee, async () => {
            let _transferFee = await instance.transferFee();
            assert.equal(_transferFee.valueOf(), transferFee , `wrong transferFee`);
        });

        it("It should have a valid owner: "+accounts[0], async () => {
            let _addr = await instance.owner();
            assert.equal(_addr.valueOf(), accounts[0] , `wrong owner`);
        });

        it("It should not be paused", async () => {
            let _addr = await instance.paused();
            assert.equal(_addr.valueOf(), false , `wrong state`);
        });
    });

/**
* @dev ticket creation / primary market phase
*/
    // check Ticket creation process
    describe('when creating tickets', async () => {
        
        beforeEach('create ticket1', async () => {
            ticket1 = await instance.buyTicket({ value: 1e+18, from: attendee1 });
        });

        it('It should create the first ticket and emit an event', async () => {
          truffleAssert.eventEmitted(ticket1, 'TicketCreated', (ev) => {
            return ev._by === attendee1 && ev._ticketId == firstTicket.id;
          }); 
        });
    
        it('It should not create another Ticket with the same id', async () => {
            let ticket2 = await instance.buyTicket({ value: 1e+18, from: attendee1 });
            truffleAssert.eventEmitted(ticket2, 'TicketCreated', (ev) => {
              return ev._by === attendee1 && ev._ticketId == 1;
            }); 
        });

        it(`It should belong to ${accounts[1]}`, async () => {
            let ownerOfTicket = await instance.ownerOf(firstTicket.id);
            assert.equal(ownerOfTicket.valueOf(), attendee1 , `Owner should be ${attendee1}`);
        });

        it(`It should be possible to verify the ticket ownership`, async () => {
            let ownership = await instance.checkTicketOwnership(firstTicket.id,{from: attendee1});
            assert.equal(ownership.valueOf(), true , `Owner should be ${attendee1}`);
        }); 

        it(`It should be possible to view one's balance`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            let bal = await instance.balanceOf(attendee1,{from: attendee1});
            assert.equal(bal.toString(10).valueOf(), 3 , `Owner's balance should be 3 tickets`);
        }); 

        it(`It should be possible to destroy it by the owner`, async () => {
            let d = await instance.destroyTicket(firstTicket.id,{ from: attendee1 });
            truffleAssert.eventEmitted(d, 'TicketDestroyed', (ev) => {
                return ev._ticketId == firstTicket.id;
            })
        });

        it(`It should reduce the ticket balance by 1 after destruction of ticket1`, async () => {
            await instance.destroyTicket(firstTicket.id,{ from: attendee1 });
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            let bal = await instance.balanceOf(attendee1,{from: attendee1});
            assert.equal(bal.toString(10).valueOf(), 2 , `Owner's balance should be 3 tickets`);
        }); 


        it(`It should pay money to the contract`, async () => {
            web3.eth.getBalance(instance.address, function(err,res) {
                assert.equal(res.valueOf(), initialPrice.toString(10), `contract should have at least initial ticket price as balance`);
            });
        });

        it(`It should be possible to withdraw the balance`, async () => {
            let w = await instance.withdrawBalance({ from: owner });
            truffleAssert.eventEmitted(w, 'BalanceWithdrawn', (ev) => {
                return ev._to === owner && ev._amount == 1e+18;
            });
        });
    });

/**
* @dev secondary market phase
*/
    // check Ticket p2p transfers
    describe('when selling a ticket to another attendee', async () => {

        beforeEach('create ticket1', async () => {
            ticket1 = await instance.buyTicket({ value: 1e+18, from: attendee1 });
        });
        
        it(`It should be possible to change the price of ticket1`, async () => {
            let p = await instance.setTicketPrice(newPrice2,firstTicket.id,{ from: attendee1 });
            truffleAssert.eventEmitted(p, 'TicketPriceChanged', (ev) => {
                return ev._by === attendee1 && ev._ticketId == firstTicket.id && ev._price == newPrice2.toString(10);
            });
        });

        it(`It should be possible to set ticket1 for sale`, async () => {
            let s = await instance.setTicketForSale(firstTicket.id,{ from: attendee1 });
            truffleAssert.eventEmitted(s, 'TicketForSale', (ev) => {
                return ev._ticketId == firstTicket.id;
            });
        });

        it(`It should be possible to cancel the sale of ticket1`, async () => {
            await instance.setTicketForSale(firstTicket.id,{ from: attendee1 });
            let c = await instance.cancelTicketSale(firstTicket.id,{ from: attendee1 });
            truffleAssert.eventEmitted(c, 'TicketSaleCancelled', (ev) => {
                return ev._ticketId == firstTicket.id;
            });
        });

        it(`It should be possible to buy ticket1 now from attendee1`, async () => {
            await instance.setTicketPrice(newPrice2,firstTicket.id,{ from: attendee1 });
            await instance.setTicketForSale(firstTicket.id,{ from: attendee1 });
            await instance.approveAsBuyer(attendee2, firstTicket.id,{ from: attendee1});
            let t = await instance.buyTicketFromAttendee(firstTicket.id,{value: newPrice3, from: attendee2, gas: "6500000"});
            truffleAssert.eventEmitted(t, 'TicketSold', (ev) => {
                return ev._ticketId == firstTicket.id;
            });
        });   

        it(`It should belong to ${attendee2} now`, async () => {
            await instance.setTicketPrice(newPrice2,firstTicket.id,{ from: attendee1 });
            await instance.setTicketForSale(firstTicket.id,{ from: attendee1 });
            await instance.approveAsBuyer(attendee2, firstTicket.id,{ from: attendee1});
            await instance.buyTicketFromAttendee(firstTicket.id,{value: newPrice3, from: attendee2, gas: "6500000"});
            let ownerOfTicket = await instance.ownerOf(firstTicket.id);
            assert.equal(ownerOfTicket.valueOf(), attendee2 , `Owner should be ${attendee2}`);
        });
    });

/**
* @dev unit tests of functions and modifiers
*/
    // check misc getter/setter functions
    describe('when a value is set', async () => {

        //set TicketToUsed
        it(`It should be possible to return the "used" status correctly`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            await instance.setTicketToUsed(firstTicket.id,{ from: owner });
            let u = await instance.getTicketStatus(firstTicket.id);
            assert.isTrue(u.valueOf(), `ticket should be used`);
        }); 

        //set TicketForSale and return status
        it(`It should be possible to return the initial "forSale" status correctly`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            let x = await instance.getTicketResaleStatus(firstTicket.id);
            assert.isFalse(x.valueOf(), `should be false`);
        });

        //get TicketReSaleStatus
        it(`It should be possible to return the new "forSale" status correctly`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            await instance.setTicketForSale(firstTicket.id,{ from: attendee1 })
            let r = await instance.getTicketResaleStatus(firstTicket.id);
            assert.isTrue(r.valueOf(), `should be true`);
        });

        //getTicketPrice
        it(`It should return the correct "TicketPrice" `, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            let p = await instance.getTicketPrice(firstTicket.id);
            assert.equal(p.toString(10).valueOf(), firstTicket.price, `TicketPrice is wrong`);
        }); 

        //getMaxTicketPrice
        it(`It should be possible to calculate the "maxTicketPrice" value correctly`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            let m = await instance.getMaxTicketPrice(firstTicket.id);
            assert.equal(m.valueOf(), maxPriceMultiple*initialPrice, `getMaxTicketPrice is wrong`);
        }); 
    });

    // check modifiers
    describe('when wrong input is given or rules are violated', async () => {

        //modifier isAvailable
        it(`It should NOT be possible to do buy new tickets if supply has run out`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            await instance.setTicketSupply(1,{ from: owner });
            truffleAssert.reverts(instance.buyTicket({ value: 1e+18, from: attendee2 }), "no more new tickets available");
        });

        //modifier isNotUsed
        it(`It should NOT be possible to set a ticket for sale if it is already used`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            await instance.setTicketToUsed(firstTicket.id,{ from: owner });
            truffleAssert.reverts(instance.setTicketForSale(firstTicket.id,{ from: attendee1 }), "ticket already used");
        });

        //modifier isTicketOwner
        it(`It should NOT be possible to set a ticket for sale if not the owner`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 })
            truffleAssert.reverts(instance.setTicketForSale(firstTicket.id,{ from: attendee2 }), "no permission");
        });

        //modifier priceCap
        it(`It should NOT be possible to do set a ticket price higher than the specified cap`, async () => {
            await instance.buyTicket({ value: 1e+18, from: attendee1 });
            truffleAssert.reverts(instance.setTicketPrice(web3.utils.toWei(web3.utils.toBN(5)),firstTicket.id,{ from: attendee1 }),"price must be lower than the maximum price");
        });

    });

});