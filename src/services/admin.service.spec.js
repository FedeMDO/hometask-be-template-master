const { mapBestClients } = require('./admin.service');

describe('mapBestClients', () => {
  it('should return an array of objects with the correct keys', () => {
    const input = [
      { id: 1, fullName: 'Carl Johnson', Client: [{ Jobs: [{ dataValues: { total_spent: 100 } }] }] },
      { id: 2, fullName: 'Franklin Clinton', Client: [{ Jobs: [{ dataValues: { total_spent: 200 } }] }] },
    ];
    const result = mapBestClients(input);
    expect(result).toEqual([
      { id: 1, fullName: 'Carl Johnson', paid: 100 },
      { id: 2, fullName: 'Franklin Clinton', paid: 200 },
    ]);
  });
});
