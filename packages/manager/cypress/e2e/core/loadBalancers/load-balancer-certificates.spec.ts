/**
 * @file Integration tests for Akamai Global Load Balancer certificates page.
 */

import {
  mockAppendFeatureFlags,
  mockGetFeatureFlagClientstream,
} from 'support/intercepts/feature-flags';
import { makeFeatureFlagData } from 'support/util/feature-flags';
import { loadbalancerFactory, certificateFactory } from '@src/factories';
import { ui } from 'support/ui';
import { randomItem, randomLabel, randomString } from 'support/util/random';
import {
  mockDeleteLoadBalancerCertificate,
  mockDeleteLoadBalancerCertificateError,
  mockGetLoadBalancer,
  mockGetLoadBalancerCertificates,
  mockUploadLoadBalancerCertificate,
} from 'support/intercepts/load-balancers';
import { Loadbalancer, Certificate } from '@linode/api-v4/types';

/**
 * Deletes the TLS / Service Target certificate in the AGLB landing page.
 *
 * @param loadBalancer - The load balancer that contains the certificate to be deleted.
 * @param certificatesDeleteBefore - The array of certificates to be displayed before deleting.
 * @param certificatesDeleteAfter - The array of certificates to be displayed after deleting.
 *
 * Asserts that the landing page has updated to reflect the changes.
 */
const deleteCertificate = (
  loadBalancer: Loadbalancer,
  certificatesDeleteBefore: Certificate[],
  certificatesDeleteAfter: Certificate[]
) => {
  mockAppendFeatureFlags({
    aglb: makeFeatureFlagData(true),
  }).as('getFeatureFlags');
  mockGetFeatureFlagClientstream().as('getClientStream');
  mockGetLoadBalancer(loadBalancer).as('getLoadBalancer');
  mockGetLoadBalancerCertificates(loadBalancer.id, certificatesDeleteBefore).as(
    'getCertificates'
  );

  cy.visitWithLogin(`/loadbalancers/${loadBalancer.id}/certificates`);
  cy.wait([
    '@getFeatureFlags',
    '@getClientStream',
    '@getLoadBalancer',
    '@getCertificates',
  ]);

  // Delete a TLS/Service Target certificate.
  const certificateToDeleteLabel = certificatesDeleteBefore[0].label;
  ui.actionMenu
    .findByTitle(`Action Menu for certificate ${certificateToDeleteLabel}`)
    .should('be.visible')
    .click();
  ui.actionMenuItem.findByTitle('Delete').should('be.visible').click();

  mockDeleteLoadBalancerCertificate(
    loadBalancer.id,
    certificatesDeleteBefore[0].id
  ).as('deleteCertificate');

  mockGetLoadBalancerCertificates(loadBalancer.id, certificatesDeleteAfter).as(
    'getCertificates'
  );

  ui.dialog
    .findByTitle(`Delete Certificate ${certificateToDeleteLabel}?`)
    .should('be.visible')
    .within(() => {
      ui.button
        .findByTitle('Delete')
        .should('be.visible')
        .should('be.enabled')
        .click();
    });

  cy.wait(['@deleteCertificate', '@getCertificates']);

  // Confirm that the deleted certificate is removed from the table with expected info.
  cy.findByText(certificateToDeleteLabel).should('not.exist');

  if (certificatesDeleteAfter.length === 0) {
    // Confirm that Cloud Manager allows users to delete the last certificate, and display empty state gracefully.
    cy.findByText('No items to display.').should('be.visible');
  }
};

describe('Akamai Global Load Balancer certificates page', () => {
  let mockLoadBalancer: Loadbalancer;

  before(() => {
    mockLoadBalancer = loadbalancerFactory.build();
  });

  /*
   * - Confirms Load Balancer certificate upload UI flow using mocked API requests.
   * - Confirms that TLS and Service Target certificates can be uploaded.
   * - Confirms that certificates table update to reflects uploaded certificates.
   */
  it('can upload a TLS certificate', () => {
    const mockLoadBalancerCertTls = certificateFactory.build({
      label: randomLabel(),
      type: 'downstream',
    });

    mockAppendFeatureFlags({
      aglb: makeFeatureFlagData(true),
    }).as('getFeatureFlags');
    mockGetFeatureFlagClientstream().as('getClientStream');
    mockGetLoadBalancer(mockLoadBalancer).as('getLoadBalancer');
    mockGetLoadBalancerCertificates(mockLoadBalancer.id, []).as(
      'getCertificates'
    );

    cy.visitWithLogin(`/loadbalancers/${mockLoadBalancer.id}/certificates`);
    cy.wait([
      '@getFeatureFlags',
      '@getClientStream',
      '@getLoadBalancer',
      '@getCertificates',
    ]);

    // Confirm that no certificates are listed.
    cy.findByText('No items to display.').should('be.visible');

    // Upload a TLS certificate.
    ui.button
      .findByTitle('Upload Certificate')
      .should('be.visible')
      .should('be.enabled')
      .click();

    mockUploadLoadBalancerCertificate(
      mockLoadBalancer.id,
      mockLoadBalancerCertTls
    ).as('uploadCertificate');

    mockGetLoadBalancerCertificates(mockLoadBalancer.id, [
      mockLoadBalancerCertTls,
    ]).as('getCertificates');

    ui.drawer
      .findByTitle('Upload TLS Certificate')
      .should('be.visible')
      .within(() => {
        cy.findByLabelText('Label')
          .should('be.visible')
          .type(mockLoadBalancerCertTls.label);

        cy.findByLabelText('TLS Certificate')
          .should('be.visible')
          .type(randomString(32));

        cy.findByLabelText('Private Key')
          .should('be.visible')
          .type(randomString(32));

        ui.buttonGroup
          .findButtonByTitle('Upload Certificate')
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click();
      });

    cy.wait(['@uploadCertificate', '@getCertificates']);

    // Confirm that new certificate is listed in the table with expected info.
    cy.findByText(mockLoadBalancerCertTls.label).should('be.visible');
  });

  it('can upload a service target certificate', () => {
    const mockLoadBalancerCertServiceTarget = certificateFactory.build({
      label: randomLabel(),
      type: 'ca',
    });

    mockAppendFeatureFlags({
      aglb: makeFeatureFlagData(true),
    }).as('getFeatureFlags');
    mockGetFeatureFlagClientstream().as('getClientStream');
    mockGetLoadBalancer(mockLoadBalancer).as('getLoadBalancer');
    mockGetLoadBalancerCertificates(mockLoadBalancer.id, []).as(
      'getCertificates'
    );

    cy.visitWithLogin(`/loadbalancers/${mockLoadBalancer.id}/certificates/ca`);
    cy.wait([
      '@getFeatureFlags',
      '@getClientStream',
      '@getLoadBalancer',
      '@getCertificates',
    ]);

    // Confirm that no certificates are listed.
    cy.findByText('No items to display.').should('be.visible');

    // Upload a TLS certificate.
    ui.button
      .findByTitle('Upload Certificate')
      .should('be.visible')
      .should('be.enabled')
      .click();

    // Upload a service target certificate.
    mockUploadLoadBalancerCertificate(
      mockLoadBalancer.id,
      mockLoadBalancerCertServiceTarget
    ).as('uploadCertificate');
    mockGetLoadBalancerCertificates(mockLoadBalancer.id, [
      mockLoadBalancerCertServiceTarget,
    ]).as('getCertificates');

    ui.drawer
      .findByTitle('Upload Service Target Certificate')
      .should('be.visible')
      .within(() => {
        cy.findByLabelText('Label')
          .should('be.visible')
          .type(mockLoadBalancerCertServiceTarget.label);

        cy.findByLabelText('Server Certificate')
          .should('be.visible')
          .type(randomString(32));

        ui.buttonGroup
          .findButtonByTitle('Upload Certificate')
          .scrollIntoView()
          .should('be.visible')
          .should('be.enabled')
          .click();
      });

    cy.wait(['@uploadCertificate', '@getCertificates']);

    // Confirm that both new certificates are listed in the table with expected info.
    cy.findByText(mockLoadBalancerCertServiceTarget.label).should('be.visible');
  });

  /*
   * - Confirms Load Balancer certificate delete UI flow using mocked API requests.
   * - Confirms that TLS and Service Target certificates can be deleted.
   * - Confirms that certificates table update to reflects deleted certificates.
   * - Confirms that the last certificate can be deleted.
   */
  it('can delete a TLS certificate', () => {
    const mockLoadBalancerCertsTls = certificateFactory.buildList(5, {
      type: 'downstream',
    });
    const mockLoadBalancerAfterDeleteCertsTls = mockLoadBalancerCertsTls.slice(
      1
    );

    deleteCertificate(
      mockLoadBalancer,
      mockLoadBalancerCertsTls,
      mockLoadBalancerAfterDeleteCertsTls
    );
  });

  it('can delete a service target certificate', () => {
    const mockLoadBalancerCertsTls = certificateFactory.buildList(5, {
      type: 'ca',
    });
    const mockLoadBalancerAfterDeleteCertsTls = mockLoadBalancerCertsTls.slice(
      1
    );

    deleteCertificate(
      mockLoadBalancer,
      mockLoadBalancerCertsTls,
      mockLoadBalancerAfterDeleteCertsTls
    );
  });

  it('can delete the last certificate', () => {
    const mockLoadBalancerCertsTls = certificateFactory.buildList(1, {
      type: randomItem(['ca', 'downstream']),
    });
    const mockLoadBalancerAfterDeleteCertsTls = mockLoadBalancerCertsTls.slice(
      1
    );

    deleteCertificate(
      mockLoadBalancer,
      mockLoadBalancerCertsTls,
      mockLoadBalancerAfterDeleteCertsTls
    );
  });

  it('can handle server errors gracefully when failing to delete the certificate', () => {
    const mockLoadBalancerCertsTls = certificateFactory.buildList(1, {
      type: randomItem(['ca', 'downstream']),
    });
    const mockLoadBalancerAfterDeleteCertsTls = mockLoadBalancerCertsTls.slice(
      1
    );

    mockAppendFeatureFlags({
      aglb: makeFeatureFlagData(true),
    }).as('getFeatureFlags');
    mockGetFeatureFlagClientstream().as('getClientStream');
    mockGetLoadBalancer(mockLoadBalancer).as('getLoadBalancer');
    mockGetLoadBalancerCertificates(
      mockLoadBalancer.id,
      mockLoadBalancerCertsTls
    ).as('getCertificates');

    cy.visitWithLogin(`/loadbalancers/${mockLoadBalancer.id}/certificates`);
    cy.wait([
      '@getFeatureFlags',
      '@getClientStream',
      '@getLoadBalancer',
      '@getCertificates',
    ]);

    // Delete a TLS/Service Target certificate.
    const certificateToDeleteLabel = mockLoadBalancerCertsTls[0].label;
    ui.actionMenu
      .findByTitle(`Action Menu for certificate ${certificateToDeleteLabel}`)
      .should('be.visible')
      .click();
    ui.actionMenuItem.findByTitle('Delete').should('be.visible').click();

    mockDeleteLoadBalancerCertificateError(
      mockLoadBalancer.id,
      mockLoadBalancerCertsTls[0].id
    ).as('deleteCertificateError');

    ui.dialog
      .findByTitle(`Delete Certificate ${certificateToDeleteLabel}?`)
      .should('be.visible')
      .within(() => {
        ui.button
          .findByTitle('Delete')
          .should('be.visible')
          .should('be.enabled')
          .click();
      });

    cy.wait('@deleteCertificateError');

    ui.dialog
      .findByTitle(`Delete Certificate ${certificateToDeleteLabel}?`)
      .should('be.visible')
      .within(() => {
        // Confirm that an error message shows up in the dialog
        cy.findByText(
          'An error occurred while deleting Load Balancer certificate.'
        ).should('be.visible');
      });
  });
});
