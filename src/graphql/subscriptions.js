/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateDriverFeature = /* GraphQL */ `
  subscription OnCreateDriverFeature(
    $filter: ModelSubscriptionDriverFeatureFilterInput
  ) {
    onCreateDriverFeature(filter: $filter) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const onUpdateDriverFeature = /* GraphQL */ `
  subscription OnUpdateDriverFeature(
    $filter: ModelSubscriptionDriverFeatureFilterInput
  ) {
    onUpdateDriverFeature(filter: $filter) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const onDeleteDriverFeature = /* GraphQL */ `
  subscription OnDeleteDriverFeature(
    $filter: ModelSubscriptionDriverFeatureFilterInput
  ) {
    onDeleteDriverFeature(filter: $filter) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const onCreateTripEvent = /* GraphQL */ `
  subscription OnCreateTripEvent(
    $filter: ModelSubscriptionTripEventFilterInput
  ) {
    onCreateTripEvent(filter: $filter) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onUpdateTripEvent = /* GraphQL */ `
  subscription OnUpdateTripEvent(
    $filter: ModelSubscriptionTripEventFilterInput
  ) {
    onUpdateTripEvent(filter: $filter) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const onDeleteTripEvent = /* GraphQL */ `
  subscription OnDeleteTripEvent(
    $filter: ModelSubscriptionTripEventFilterInput
  ) {
    onDeleteTripEvent(filter: $filter) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
