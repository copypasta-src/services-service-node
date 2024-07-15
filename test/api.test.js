
// TODO add more test cases here
const app = require('../src/appfile'); // Adjust the path as necessary to import your Express app
(async () => {
    const chai = await import('chai');
    const chaiHttp = await import('chai-http');
    chai.use(chaiHttp);
    chai.should();

    describe("API", () => {
        describe("GET /status", () => {
            // Test to get the status of the API
            it("should get the status message", async (done) => {
                chai.request(app)
                    .get('/status')
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('message').eql('API is working.');
                        done();
                    });
            });
        });
    });
})();

