import { renderLineTemplate } from './line-template';

describe('renderLineTemplate', () => {
  it('substitutes known vars and blanks unknown', () => {
    expect(
      renderLineTemplate('Hi {{customerName}} bal={{outstandingBalance}} x={{nope}}', {
        customerName: 'Ann',
        outstandingBalance: '100.00',
      }),
    ).toBe('Hi Ann bal=100.00 x=');
  });
});
