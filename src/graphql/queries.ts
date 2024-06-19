import { gql } from '@apollo/client';

export const GET_ANIMATION = gql`
  query PublicAnimation($id: Int!) {
    publicAnimation(id: $id) {
      id
      name
      url
      jsonUrl
    }
  }
`;
